export function returnDeviceData(userF2xAgent: string) {
    if (userF2xAgent) {
      let headerArr = userF2xAgent.split("; ");
      let headerObj = {};
  
      for (let param of headerArr) {
        let paramArr = param.split("=");
        headerObj[paramArr[0]] = paramArr[1];
      }
  
      return {
        deviceId: headerObj["deviceId"],
        appVersion: headerObj["app"] + " " + headerObj["app_v"],
        os: headerObj?.["os"] + " " + headerObj["os_v"],
        osType: headerObj?.["os"]?.toLowerCase() === "android" ? (headerObj["model"]?.toLowerCase()?.includes("hauwei") ? 2 : 1) : 0,
        deviceDescription: headerObj["model"],
        app: headerObj["app"],
        lang: headerObj["lang"],
        theme: headerObj["theme"],
        channel: headerObj["channel"] ? headerObj["channel"] : "UNKNOWN"
      };
    }
  }