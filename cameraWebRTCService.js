/**
 * Enable this module if and only if WebRTC feature does exists in this
 * browser version.
 * This will replace the implementation of Camera service. Otherwise,
 * use the Cordova's plugin.
 *
 * @author diego
 *
 */
if (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia) {

    angular.module('webrtc').service('Camera', ['$q', 'environment', function ($q, environment) {

        var _CANVAS_ID = 'hiddenPreview';
        var _DISCLAIMER_PICTURE_ID = 'DISCLAIMER_PICTURE';
        var _GATHER_PROOF_PICTURE_1_ID = 'GATHER_PROOF_PICTURE_1';
        var _GATHER_PROOF_PICTURE_2_ID = 'GATHER_PROOF_PICTURE_2';

        /** Current video html5 tag */
        var _video;

        /** Dynamic canvas for drawing a temp preview */
        var _canvas;

        /** Array of registeres video devices */
        var _cameras = [];

        /** Notify when camera is ready to be consumed */
        var _initPromise = $q.defer();

        /** */
        var _candidates = [
            {
                "label": "4K(UHD)",
                "width": 3840,
                "height": 2160,
                "ratio": "16:9"
            },
            {
                "label": "1080p(FHD)",
                "width": 1920,
                "height": 1080,
                "ratio": "16:9"
            },
            {
                "label": "UXGA",
                "width": 1600,
                "height": 1200,
                "ratio": "4:3"
            },
            {
                "label": "720p(HD)",
                "width": 1280,
                "height": 720,
                "ratio": "16:9"
            },
            {
                "label": "SVGA",
                "width": 800,
                "height": 600,
                "ratio": "4:3"
            },
            {
                "label": "VGA",
                "width": 640,
                "height": 480,
                "ratio": "4:3"
            }
        ];

        /** Current resolution to be tested */
        var _currentCandidate = 0;

        /**
         *
         * @param cameraId
         */
        this.attachBigCameraView = function (cameraId) {

            _initCamera(_candidates[_currentCandidate], cameraId);
        };

        /**
         *
         * @param cameraId
         */
        this.attachSmallCameraView = function (cameraId) {

            _initCamera(_candidates[_currentCandidate], cameraId);
        };

        /**
         *
         */
        this.getPictureFromRearCamera = function () {

            _initCamera(_candidates[_currentCandidate], this.getFrontCameraId());
        };

        /**
         *
         */
        this.resetCamera = function () {

            this.removeCamera();

        };

        /**
         *
         * @param isDisclaimerPicture
         */
        this.captureSelfieSnapshot = function (isDisclaimerPicture) {

            var q = $q.defer();

            try {

                _canvas.width = _video.videoWidth;
                _canvas.height = _video.videoHeight;
                _canvas.getContext('2d').drawImage(_video, 0, 0, _canvas.width, _canvas.height);

                q.resolve(_canvas.toDataURL("image/jpeg"));

            } catch (ex) {

                q.reject(ex);
            }

            return q.promise;
        };

        /**
         *
         */
        this.removeCamera = function () {

            if (window.stream) {

                window.stream.getTracks().forEach(function (track) {

                    track.stop();
                });
            }

            var oldcanv = document.getElementById(_CANVAS_ID);

            if (oldcanv) {

                document.querySelector('body').removeChild(oldcanv);
            }

        };

        /**
         *
         * @returns {number}
         */
        this.getFrontCameraId = function () {
            return 0;
        };

        /**
         *
         * @returns {number}
         */
        this.getRearCameraId = function () {
            return _cameras.length > 1 ? 1 : 0;
        };

        /**
         *
         * @returns {boolean}
         */
        this.checkHasFrontCamera = function () {

            _initPromise.promise.then(function () {

                environment.setHasFrontCamera(_cameras.length > 1);

            });

        };

        this.getDisclaimerPictureId = function () {

            return _DISCLAIMER_PICTURE_ID;
        };

        this.getGatherProofPicture1Id = function () {

            return _GATHER_PROOF_PICTURE_1_ID;
        };

        this.getGatherProofPicture2Id = function () {

            return _GATHER_PROOF_PICTURE_2_ID;
        };

        var _gotDevices = function (devicesInfo) {

            devicesInfo.forEach(function (d) {

                if (d.kind === 'videoinput') {

                    _cameras.push(d);
                }
            });

            _initPromise.resolve();

        };

        var _onEnumerateDevicesError = function (error) {

            _initPromise.reject(error);
        };

        var _initCamera = function (candidate, cameraId) {

            _initPromise.promise.then(function () {

                _video = document.getElementById('webrtc-video');

                navigator.mediaDevices.getUserMedia({

                    audio: false,

                    video: {

                        deviceId: _cameras[cameraId].deviceId,
                        width: { exact: candidate.width },
                        height: { exact: candidate.height }
                    }


                }).then(_handleSuccess.curry(candidate))
                  .catch(_onGetUserMediaError.curry(candidate, cameraId));
            });
        };

        var _handleSuccess = function (candidate, stream) {

            _currentCandidate = 0; // reset candidate test
            window.stream = stream; // make stream available to browser console
            _video.onplay = _displayVideoDimensions;
            _video.src = URL.createObjectURL(stream);
            _video.load();
            _video.play();
        };

        var _onGetUserMediaError = function (candidate, cameraId, error) {

            if (error.name === 'ConstraintNotSatisfiedError') {
                if (window.stream) {

                    window.stream.getTracks().forEach(function (track) {

                        track.stop();
                    });
                }

                _currentCandidate++;

                if (_currentCandidate < _candidates.length) {

                    _initCamera(_candidates[_currentCandidate], cameraId);
                }

            }
        };

        var _displayVideoDimensions = function () {

            if (!_video.videoWidth) {
                setTimeout(_displayVideoDimensions, 500);
            }
        };

        /**
         * Initialize service
         */
        var _init = function (videoId) {

            _canvas = document.createElement('canvas');
            _canvas.id = _CANVAS_ID;
            _canvas.style.position = 'absolute';
            _canvas.style.zIndex = '-1000';
            document.getElementsByTagName('body')[0].appendChild(_canvas);

            navigator.mediaDevices.enumerateDevices().then(_gotDevices)
                .catch(_onEnumerateDevicesError);
        };

        _init();

    }]);
}
