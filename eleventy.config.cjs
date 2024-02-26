function titalize(str) {
  return str && str[0].toUpperCase() + str.slice(1);
}

/** @param {import('@11ty/eleventy').UserConfig} llty */
module.exports = function(llty) {
  llty.ignores.add('README.md')
  // llty.ignores.add('layout')
  

  llty.addPassthroughCopy('style')
  llty.addPassthroughCopy('public')

  llty.addGlobalData('layout', 'default')
  llty.addGlobalData('eleventyComputed', { 
    path: ({ page }) => [
      ['Bard with Wings', '/'],
      ...page.url.split('/')
                 .filter(t => t && '' !== t)
                 .slice(0, -1)
                 .map((title, i, a) => ([titalize(title), '/' + a.slice(i).join('/')]))
      ]
  })

  // Return your Object options:
  return {
    dir: {
      input: 'content',
      output: 'dist',
      layouts: '../layout'
    }
  }
};
