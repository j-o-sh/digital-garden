function titalize(str) {
  return str && str[0].toUpperCase() + str.slice(1);
}

/** @param {import('@11ty/eleventy').UserConfig} llty */
module.exports = function(llty) {
  llty.ignores.add('README.md')
  // llty.ignores.add('layout')
  

  llty.addPassthroughCopy('style')

  llty.addGlobalData('layout', 'default')
  llty.addGlobalData('eleventyComputed', { 
    path: ({ page }) => [
      'Bard with Wings',
      ...page.url.split('/')
                 .filter(t => t && '' !== t)
                 .slice(0, -1)
                 .map(titalize)
      ]
  })

  // Return your Object options:
  return {
    dir: {
      input: '.',
      output: 'dist',
      layouts: 'layout'
    }
  }
};