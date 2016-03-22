const fs = require('fs');
const path = require('path');

const loaderUtils = require('loader-utils');
const MT = require('mark-twain');
const R = require('ramda');
const babel = require('babel-core');
const ejs = require('ejs');

const isCode = R.whereEq({ type: 'code', props: { lang: 'js' } });
const isStyle = R.whereEq({ type: 'code', props: { lang: 'css' } });
const getChildren = R.compose(R.prop('children'), R.defaultTo({}));

const util = require('atool-doc-util');

function calculateHtmlPath(cwd, source) {
  const selfPath = path.relative(cwd, source);
  return path.join(path.dirname(selfPath), `${path.basename(selfPath, path.extname(selfPath))}.html`);
}

module.exports = function(content) {

  this.cacheable && this.cacheable();

  const options = this.options;
  const resourcePath = this.resourcePath;

  const query = loaderUtils.parseQuery(this.query);

  const name = path.relative(options.cwd, resourcePath);

  const fileContentTree = MT(content).content;

  const code = getChildren(fileContentTree.find(isCode));
  const style = getChildren(fileContentTree.find(isStyle));

  const tpl = query.template;
  this.addDependency(tpl);

  const scripts = [
    path.relative(resourcePath, path.join(options.cwd, options.tplSource, 'common.js')),
    `${path.basename(resourcePath, path.extname(resourcePath))}.js`,
  ];

  const html = ejs.render(fs.readFileSync(tpl, 'utf-8'), {
    file: {
      title: name,
      script: scripts,
      style: style,
      desc: util.marked(fileContentTree),
    },
  });

  this.emitFile(calculateHtmlPath(options.cwd, resourcePath), html);

  return `module.exports = ${babel.transform(code, {
    presets: ['es2015', 'react'],
  }).code}`;
}
