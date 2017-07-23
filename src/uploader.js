import aws from 'aws-sdk'
import mime from 'mime-types'
import multer from 'multer'
import { Readable } from 'stream'

const localMulter = multer()

export function useUploader (app, config) {
  // unpack
  const { awsConfig,
    BucketName,
    routePath,
    uploadsBucket
  } = config
  // update
  const s3 = new aws.S3()
  aws.config.update(awsConfig)
  // s3
  const upload = async (file, config = {}) => {
    const { fileName, isOverride } = config
    const { buffer, mimetype } = file
    const s3FileName = fileName || file.originalname
    return new Promise((resolve, reject) => {
      const getObjectConfig = {
        Bucket: BucketName,
        Key: `uploads/${s3FileName}.${mime.extension(mimetype)}`,
      }
      const uploadConfig = Object.assign({
        ContentType: mimetype,
        ACL: 'public-read'
      }, getObjectConfig)
      // check first
      s3.headObject(uploadConfig, (err, metadata) => {
        // handle no object on cloud here
        if (err && err.code === 'NotFound') {
          reject(err)
        } else {
          // Try to get an existing object
          s3.getObject(getObjectConfig)
            .on('success', response => {
              // just get the signedUrl
              if (isOverride) {
                uploadConfig.Body = buffer
                s3.upload(uploadConfig, (err, payload) => {
                  if (err) {
                    reject(err)
                  } else {
                    resolve({ isNew: true, url: payload.Location })
                  }
                })
              } else {
                s3.getSignedUrl('getObject', getObjectConfig, (err, signedUrl) => {
                  if (err) {
                    reject(err)
                    return
                  } else if (signedUrl) {
                    const uploadUrl = signedUrl.split('?')[0]
                    resolve({ url: uploadUrl })
                  }
                })
              }
            }).on('error', error => {
              // do the upload
              uploadConfig.Body = buffer
              s3.upload(uploadConfig, (err, payload) => {
                if (err) {
                  reject(err)
                } else {
                  resolve({ isNew: true, url: payload.Location })
                }
              })
            }).send()
        }
      })
    }).catch(err => console.warn(err))
  }
  // get
  app.post(`${routePath}/:fileName`, localMulter.single('uploader'), async (req, res) => {
    // unpack
    const { file, params: { fileName }, query: { isOverride } } = req
    // json
    const json = {}
    // check
    if (!file) {
      json.error = 'No file found to upload'
    }
    // try
    try {
      const result = await upload(file, {
        isOverride,
        fileName
      })
      Object.assign(json, result)
    } catch (error) {
      json.error = error
      console.warn(`${routePath} api`, error)
    }
    // send
    res.json(json)
  })
}
