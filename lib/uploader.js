'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useUploader = useUploader;

var _awsSdk = require('aws-sdk');

var _awsSdk2 = _interopRequireDefault(_awsSdk);

var _mimeTypes = require('mime-types');

var _mimeTypes2 = _interopRequireDefault(_mimeTypes);

var _multer = require('multer');

var _multer2 = _interopRequireDefault(_multer);

var _stream = require('stream');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var localMulter = (0, _multer2.default)();

function useUploader(app, config) {
  var _this = this;

  // unpack
  var awsConfig = config.awsConfig,
      BucketName = config.BucketName,
      routePath = config.routePath,
      uploadsBucket = config.uploadsBucket;
  // update

  var s3 = new _awsSdk2.default.S3();
  _awsSdk2.default.config.update(awsConfig);
  // s3
  var upload = function () {
    var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(file) {
      var config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var fileName, isOverride, buffer, mimetype, s3FileName;
      return regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              fileName = config.fileName, isOverride = config.isOverride;
              buffer = file.buffer, mimetype = file.mimetype;
              s3FileName = fileName || file.originalname;
              return _context.abrupt('return', new Promise(function (resolve, reject) {
                var getObjectConfig = {
                  Bucket: BucketName,
                  Key: 'uploads/' + s3FileName + '.' + _mimeTypes2.default.extension(mimetype)
                };
                var uploadConfig = Object.assign({
                  ContentType: mimetype,
                  ACL: 'public-read'
                }, getObjectConfig);
                // check first
                s3.headObject(uploadConfig, function (err, metadata) {
                  // handle no object on cloud here
                  if (err && err.code === 'NotFound') {
                    reject(err);
                  } else {
                    // Try to get an existing object
                    s3.getObject(getObjectConfig).on('success', function (response) {
                      // just get the signedUrl
                      if (isOverride) {
                        uploadConfig.Body = buffer;
                        s3.upload(uploadConfig, function (err, payload) {
                          if (err) {
                            reject(err);
                          } else {
                            resolve({ isNew: true, url: payload.Location });
                          }
                        });
                      } else {
                        s3.getSignedUrl('getObject', getObjectConfig, function (err, signedUrl) {
                          if (err) {
                            reject(err);
                            return;
                          } else if (signedUrl) {
                            var uploadUrl = signedUrl.split('?')[0];
                            resolve({ url: uploadUrl });
                          }
                        });
                      }
                    }).on('error', function (error) {
                      // do the upload
                      uploadConfig.Body = buffer;
                      s3.upload(uploadConfig, function (err, payload) {
                        if (err) {
                          reject(err);
                        } else {
                          resolve({ isNew: true, url: payload.Location });
                        }
                      });
                    }).send();
                  }
                });
              }).catch(function (err) {
                return console.warn(err);
              }));

            case 4:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, _this);
    }));

    return function upload(_x) {
      return _ref.apply(this, arguments);
    };
  }();
  // get
  app.post(routePath + '/:fileName', localMulter.single('uploader'), function () {
    var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(req, res) {
      var file, fileName, isOverride, json, result;
      return regeneratorRuntime.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              // unpack
              file = req.file, fileName = req.params.fileName, isOverride = req.query.isOverride;
              // json

              json = {};
              // check

              if (!file) {
                json.error = 'No file found to upload';
              }
              // try
              _context2.prev = 3;
              _context2.next = 6;
              return upload(file, {
                isOverride: isOverride,
                fileName: fileName
              });

            case 6:
              result = _context2.sent;

              Object.assign(json, result);
              _context2.next = 14;
              break;

            case 10:
              _context2.prev = 10;
              _context2.t0 = _context2['catch'](3);

              json.error = _context2.t0;
              console.warn(routePath + ' api', _context2.t0);

            case 14:
              // send
              res.json(json);

            case 15:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, _this, [[3, 10]]);
    }));

    return function (_x3, _x4) {
      return _ref2.apply(this, arguments);
    };
  }());
}