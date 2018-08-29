import fs from 'fs'
import {google, drive_v3} from 'googleapis'
import mkdirp from 'mkdirp'
import path from 'path'

const thisTime = "name='C94'"

const {installed: {client_id, client_secret, redirect_uris}} = require('../credentials.json')
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

const token = process.env.GOOGLE_API_TOKEN ? JSON.parse(process.env.GOOGLE_API_TOKEN) : require('../token.json')
oAuth2Client.setCredentials(token)
const drive = new drive_v3.Drive({auth: oAuth2Client})

const exportDocument = async (fileId: string, basename: string) => {
  const filePath = `${basename}.txt`
  return new Promise(async (resolve, reject) => {
    const dest = fs.createWriteStream(filePath)
    const res: any = await drive.files.export({fileId, mimeType: 'text/plain'}, {responseType: 'stream'})
    res.data
      .on('end', () => {
        console.log('Done downloading file:', filePath)
        resolve()
      })
      .on('error', (err: Error) => {
        console.error('Error downloading file', filePath)
        reject(err)
      })
      .pipe(dest)
  })
}

const isDocx = "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document'"
const isGoogleAppsDocument = "mimeType='application/vnd.google-apps.document'"
const isGoogleAppsFolder = "mimeType='application/vnd.google-apps.folder'"

const downloadFolder = async (fileId: string, dir: string) => {
  mkdirp.sync(dir)
  const q = `'${fileId}' in parents and (${isDocx} or ${isGoogleAppsDocument} or ${isGoogleAppsFolder})`
  const res = await drive.files.list({q})
  const files = res.data.files
  if (files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        if (file.id && file.name) {
          await downloadFolder(file.id, path.join(dir, file.name))
        }
      } else if (file.mimeType) {
        if (file.id && file.name) {
          await exportDocument(file.id, path.join(dir, file.name))
        }
      }
    }
  }
}

const pull = async () => {
  const rootRes = await drive.files.list({q: `${thisTime} and ${isGoogleAppsFolder}`})
  if (!rootRes.data.files) {
    return
  }
  const rootId = rootRes.data.files[0].id
  if (!rootId) {
    return
  }
  const res = await drive.files.list({q: `'${rootId}' in parents and name='原稿' and ${isGoogleAppsFolder}`})
  const files = res.data.files
  if (files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.id && file.name) {
        await downloadFolder(file.id, path.join(__dirname, '..', '.draft'))
      }
    }
  }
}

pull()
