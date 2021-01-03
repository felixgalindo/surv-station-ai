/**
 * Definition of config object
 * @author Felix Galindo
 */

const config = {
	survStationUrl: "http://192.168.5.47:5000",
	survStationUser: "surveillance-pi",
	survStationPass: "4dHB!LAeTpQm9",
	deepVisionUrl: "http://192.168.5.47:83/v1/vision/detection",
	httpServerPort: 8000,
	recDebounceTime: 60000,
	motionDebounceTime: 1000
};

module.exports = config;