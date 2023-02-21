// since watch and watch.onRebuild was completely removed 
// we have to do it ourselves with plugin onEnd callback

export const onBuildEnd = (callback) => ({
  name: 'onBuildEnd',
  setup(build) {
    build.onEnd(callback)
  }
})
