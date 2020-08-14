module.exports = function(source) {
    return source.replace(/leaflet-/g, 'locationtracker-');
};