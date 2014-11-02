module.exports = FSDir;

var fs = require('fs');
var path = require('path');
var _  = require('lodash');

var defaults = {
	path: '~',
	mountExtensions: ['js', 'json']
}

function FSDir(opts){
	if (!(this instanceof FSDir)) {
		return new FSDir(opts);
	}

	if (typeof(opts) === 'string') {
		opts = {
			path: opts
		};
	}
	opts = opts || {};
	if (opts.paren) {
		opts = _.extend(
			Object.create(opts.parent.options),
			opts
		);
	}
	this.opts = opts;
	
	this.mount = mount.bind(this);
	Object.defineProperty(this.mount, '.' ,{
		get: function() {
			return this('.');
		}
	});
	Object.defineProperty(this.mount, '..' ,{
		get: function() {
			return this('..');
		}
	});
	fs.readdirSync(this.path).forEach(function(item) {
		var mount = this.tryMount(item);
		if (mount) {
			Object.defineProperty.apply(Object, [this.mount].concat(mount));
		}
	}, this);

	return this.mount;
}

function mount(method){
	return this[method].apply(this, _.rest(arguments));
}


Object.defineProperty(FSDir.prototype, 'path', {
	get: function() {
		var basePath = this.options.path;
		if (basePath.match(/^~\//)) {
			basePath = path.join(
				process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'],
				basePath.substr(2)
			);
		}
		return this.path = basePath;
	}
});

Object.defineProperty(FSDir.prototype, 'options', {
	get: function() {
		return _.defaults(
			this.opts,
			defaults
		);
	}
});

Object.defineProperty(FSDir.prototype, 'defaultOptions', {
	value: defaults
});

_.extend(
	FSDir.prototype,
	{
		".": function() {
			return this.mount;
		},
		"..": function() {
			return this.options.parent;
		},
		fullPath: function(item) {
			return path.join(this.path, item);
		},
		stats: function(item) {
			return fs.statSync(this.fullPath(item));
		},
		tryMount: function(item) {
			var stats = this.stats(item);
			if (stats.isDirectory()) {
				return [
					item,
					{
						get: function() {
							return this[item] = FSDir({parent: this.mount, path: this.fullPath(item)});
						}.bind(this)
					}
				];
			}
			if (item.match(/\.(js|json)$/)) {
				var mountName = item.replace(/\.(js|json)$/, '');
				return [
					mountName,
					{
						get: function() {
							console.log('mount', this.fullPath(item));
							return this[mountName] = require(this.fullPath(item));
						}.bind(this)
					}
				]
			}
		}
	}
);

