all:
	rm -rf node_modules eggs parts bin
	rm -rf .sass-cache
	rm -rf src/clincoded/static/css
	rm -rf src/clincoded/static/build/*.js*

clean:
	rm -rf node_modules eggs parts bin
	rm -rf .sass-cache
	rm -rf src/clincoded/static/css

clean-css:
	rm -rf src/clincoded/static/css/style*.css

clean-js:
	rm -rf src/clincoded/static/build/*.js*
