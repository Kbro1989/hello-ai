const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

/**
 * @type {import("webpack").Configuration}
 */
module.exports = {
	context: __dirname,
	devtool: false,
	mode: "development",
	entry: {
		main: "./main.ts",
		electronviewer: "./viewer/",
		cli: "./cli.ts",
		api: "./headless/api",
		buildfiletypes: "./buildfiletypes.ts",
		maprender: "./map/mapcli.ts",
		runbrowser: "./headless/runbrowser.ts"
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: 'ts-loader',
				exclude: /node_modules/,
				options: {
					onlyCompileBundledFiles: true
				}
			},
			{
				test: /\.jsonc?$/,
				type: "asset/source"
			},
			{
				test: /\.glsl(\.c)?$/,
				type: "asset/source"
			}
		],
	},
	target: "node",
	externals: {
		// "fs", "net", "path", "os", "util", "assert",
		"sqlite3": { commonjs: "sqlite3" },
		"electron": { commonjs: "electron" },
		"electron/main": { commonjs: "electron/main" },
		"electron/renderer": { commonjs: "electron/renderer" },
		"sharp": { commonjs: "sharp" },
		"zlib": { commonjs: "zlib" },
		"lzma": { commonjs: "lzma" },
		"comment-json": { commonjs: "comment-json" },
		"gl": { commonjs: "gl" },
		"canvas": { commonjs: "canvas" }
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	externalsType: "commonjs",
	output: {
		libraryTarget: "commonjs",
		filename: "[name].js",
		chunkFilename: "generated/[contenthash].js",
		assetModuleFilename: "generated/[contenthash][ext]",
		webassemblyModuleFilename: "generated/[contenthash][ext]",
		path: path.resolve(__dirname, 'dist')
	},
	plugins: [
		new CopyWebpackPlugin({
			patterns: [
				{ from: 'src/assets', to: "assets" }
			]
		})
	]
};