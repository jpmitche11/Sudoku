const path = require( 'path' );
const webpack = require( 'webpack' );

module.exports = {
	mode: 'development',
	entry: './sudoku.js',

	output: {
		path: path.resolve( __dirname, 'dist' ),
		filename: 'app.js',
	},

	devtool: 'cheap-eval-source-map',
	devServer: {
		publicPath: '/dist/',
		contentBase: path.join(__dirname, '/')
	},

	module: {
		rules: [
			{
				test: /\.js$/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/env'],
					}
				},
				exclude: /(node_modules)/
			}
		]
	}
};
