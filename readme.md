# Shapes: Directory Structure Templates

## Installing

The CLI scripts require NodeJS v18 or higher. To install the CLI simply clone
this repository anywhere on your system.

To make the `shapes` command available system-wide, add the bin directory to
your PATH variable:

```sh
echo "export PATH=$(pwd)/bin:\$PATH" >> ~/.zshenv
```

Or symlink the appropriate script to where your shell will find it:

```sh
ln -s $(readlink -f ./bin/shapes) /usr/local/bin/shapes
```

## Configuring

By default the `shapes list` command will only list factory templates defined in
this repository. To add your own template repositories, create a
`shapes-config.mjs` file in the root of the cloned repository in the following
format:

```js
export default [
  {
    path: '~/source/my-shapes-repo', // path to the repository
    main: 'master' // the name of the main branch
  }
  // multiple repositories can be listed
  // ...
];
```

## Creating a Template

Any directory can be used as a template. By default the script looks into the
`/templates` directory in this repository, but can handle external paths, too.
When applying a template, the directory structure and any non-template files are
copied as-is. Template files are expanded before copying.

The copying process only considers directories, files and symlinks; Other types
are ignored. Make sure symlinks use relative paths and point to files within the
repository. They may break or lead to unexpected behavior otherwise.

## Template Files

To make a template file, append `.template` after its normal extension. E.g.:
`package.json.template` to define a template for Node's `package.json` file.

Template files may contain `<% ... %>` tag pairs with JavaScript code between
them. This code must evaluate to a string.

- Use the `ask(<varName>, [defaultValue])` function to ask for user input.
- Use the `env(<varName>, [defaultValue])` function to read environment values.

Example template:

```txt
{
  "name": "<% ask('PACKAGE_NAME') %>",
  "version": "1.0.0",
  "license": "<% ask('PACKAGE_LICENSE', 'ISC') %>"
}
```
