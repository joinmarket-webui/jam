const reportWebVitals = (onPerfEntry?: Function) => {
  if (onPerfEntry) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry as any)
      getFID(onPerfEntry as any)
      getFCP(onPerfEntry as any)
      getLCP(onPerfEntry as any)
      getTTFB(onPerfEntry as any)
    })
  }
}

export default reportWebVitals
