import beautify from "js-beautify";
import { renderToStaticMarkup } from "react-dom/server";
import requirefresh from "requirefresh";
import prettyError from "./utils/errors";

import glob from "glob";
import compact from "lodash/compact";
import uniq from "lodash/uniq";

const beautifyHtml = beautify.html;

require("@babel/register")({
  extensions: [".js", ".jsx"]
});

class StaticRenderHtmlWebpackPlugin {
  constructor({
    components = [],
    entry = "",
    pretty = false,
    verbose,
    ...globOptions
  } = {}) {
    this.entry = entry;
    this.pretty = pretty;
    this.files = components;
    this.verbose = !!verbose;
    this.globOptions = {
      absolute: true,
      ...globOptions
    };

    this.filesAlreadyAdded = false;
  }

  apply(compiler) {
    const entry = this.entry;

    (compiler.hooks
      ? compiler.hooks.afterCompile.tapAsync.bind(
          compiler.hooks.afterCompile,
          "WebpackWatchPlugin"
        )
      : compiler.plugin.bind(compiler, "after-compile"))(
      (compilation, callback) => {
        const filesFound = [];
        const filesFoundToEclude = [];
        this.files.map(pattern => {
          if (pattern.substr(0, 1) !== "!") {
            glob
              .sync(pattern, this.globOptions)
              .map(file => filesFound.push(file));
          } else {
            glob
              .sync(pattern.substr(1), this.globOptions)
              .map(file => filesFoundToEclude.push(file));
          }
        });

        const files = uniq(
          compact(
            filesFound.map(file => {
              if (~filesFoundToEclude.indexOf(file)) {
                return;
              }
              return file;
            })
          )
        );

        if (this.verbose && !this.filesAlreadyAdded) {
          console.log(
            "Additional files watched : ",
            JSON.stringify(files, null, 2)
          );
        }

        if (Array.isArray(compilation.fileDependencies)) {
          files.map(file => compilation.fileDependencies.push(file));
        } else {
          files.map(file => compilation.fileDependencies.add(file));
        }

        this.filesAlreadyAdded = true;
        callback();
      }
    );

    compiler.hooks.emit.tapAsync(
      { name: "JSX to HTML Static Render" },
      (compilation, callback) => {
        let result = "";

        if (!entry) {
          compilation.errors.push(prettyError.emptyEntry(compiler.context));
          return callback();
        }

        let fileExtension = entry.split(".");
        fileExtension = `.${fileExtension[fileExtension.length - 1]}`;

        const FILE_SUPPORT_REGEXP = /.(js|jsx)$/g;
        if (!FILE_SUPPORT_REGEXP.test(fileExtension)) {
          compilation.errors.push(
            prettyError.fileExtension(entry, compiler.context)
          );
          return callback();
        }

        try {
          result = requirefresh(entry);
        } catch (error) {
          compilation.errors.push(prettyError.errorWrapper(error));
          return callback();
        }

        compilation.fileDependencies.add(entry);

        if (result.default && typeof result.default === "object") {
          result = result.default;
        }

        Object.keys(result).map(key => {
          let renderedStaticMarkup = "";
          try {
            renderedStaticMarkup = `<!DOCTYPE html>${renderToStaticMarkup(
              result[key]
            )}`;
          } catch (error) {
            renderedStaticMarkup = `Error: '${error}'\nFile: '${entry}'\nProperty: '${key}'`;
            compilation.errors.push(prettyError.errorWrapper(error));
          }

          const file = {
            name: `${key}.html`,
            source: renderedStaticMarkup,
            size: renderedStaticMarkup.length
          };

          let html = file.source;

          if (this.pretty) {
            try {
              html = beautifyHtml(html, {
                indent_size: 2
              });
            } catch (error) {
              html = `Error: '${error}'\nFile: '${entry}'\nProperty: '${key}'`;
              compilation.errors.push(prettyError.errorWrapper(error));
            }
          }

          compilation.assets[file.name] = {
            source: () => html,
            size: () => file.size
          };
        });
        this.filesAlreadyAdded = true;
        callback();
      }
    );
  }
}

module.exports = StaticRenderHtmlWebpackPlugin;
