module.exports = {
    extends: ['react-app'],
    rules: {
      'no-restricted-globals': ['error', 'event', 'fdescribe'],
    },
    overrides: [
      {
        files: ['src/service-worker.js'],
        rules: {
          'no-restricted-globals': 'off'
        }
      }
    ]
  };