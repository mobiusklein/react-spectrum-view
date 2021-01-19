const path = require("path");
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
const glob = require("glob");

module.exports = {
  entry: {
    "specview.js": glob
      .sync("./src/spectrum/*.?(js|css)")
      .map((f) => path.resolve(__dirname, f))
      .concat(["./src/lib.js"]),
  },
  output: {
    filename: "build/static/js/specview.min.js",
    libraryTarget: "umd",
    library: "spectrum",
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.js$/,
        use: ["babel-loader"],
      },
    ],
  },
  mode: "development",
  plugins: [new UglifyJsPlugin()],
};
