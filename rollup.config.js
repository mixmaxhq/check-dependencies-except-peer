export default {
  input: './src/index.js',
  output: {
    file: './dist/index.js',
    format: 'cjs',
    exports: 'auto',
  },
  plugins: [
    {
      external(id) {
        return id.startsWith(`${__dirname}/node_modules/`);
      },
    },
    // {
    //   ...resolve,
    //   resolveId: (id, importer) => {
    //     console.log({id, importer});
    //     resolve.resolveId();
    //     if (!id.includes('check.js') && !id.startsWith('npm/')) return false;
    //     if (id.includes('cmd-shim')) return false;
    //     if (id.includes('socks')) return false;
    //   },
    // },
    // commonjs({
    //   include: 'node_modules/**',
    // }),
    // json(),
  ],
};
