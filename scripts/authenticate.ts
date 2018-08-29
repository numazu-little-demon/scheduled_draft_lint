import fs from 'fs'
import {google} from 'googleapis'
import readline from 'readline'
import path from 'path'

const scope = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly'
]
const tokenPath = path.join(__dirname, '..', 'token.json')

const {installed: {client_id, client_secret, redirect_uris}} = require('../credentials.json')
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

const authUrl = oAuth2Client.generateAuthUrl({access_type: 'offline', scope})
console.log('Authhorize this app by visiting this url:', authUrl)

const rl = readline.createInterface({input: process.stdin, output: process.stdout})
rl.question('Enter the code from that page here: ', code => {
  rl.close()
  oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err)
    fs.writeFileSync(tokenPath, JSON.stringify(token))
  })
})
