/**
 * Definition of config object
 * @author Felix Galindo
 */

const config = {
	survStationUrl: "http://192.168.5.47:5000",
	survStationUser: "youruser",
	survStationPass: "yourpass",
	deepVisionUrl: "http://192.168.5.47:83/v1/vision/detection",
	httpsServerPort: 8000,
	recDebounceTime: 60000,
	motionDebounceTime: 100
};

module.exports = config;