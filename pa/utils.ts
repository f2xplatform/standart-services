export function returnDeviceData(userF2xAgent: string) {
  if (userF2xAgent) {
    let headerArr = userF2xAgent.replaceAll("; ", ";").split(";");
    let headerObj = {};

    for (let param of headerArr) {
      let paramArr = param.split("=");
      headerObj[paramArr[0]] = paramArr[1];
    }

    return {
      deviceId: headerObj["deviceId"],
      appVersion: headerObj["app"] + " " + headerObj["app_v"],
      os: headerObj?.["os"] + " " + headerObj["os_v"],
      osType: headerObj?.["os"]?.toLowerCase() === "android" ? 1 : 0,
      deviceDescription: headerObj["model"],
      app: headerObj["app"],
      lang: headerObj["lang"],
      theme: headerObj["theme"],
      channel: headerObj["channel"] ? headerObj["channel"] : "UNKNOWN",
    };
  }
}

export function roundDown(num: number, decimalPlaces: number) {
  if (!decimalPlaces) return 0;
  if (num < 0) return -roundDown(-num, decimalPlaces);
  let factor = Math.pow(10, decimalPlaces);
  return (Math.floor(num * factor) / factor).toFixed(decimalPlaces);
}

export function roundUp(num: number, decimalPlaces: number) {
  if (!decimalPlaces) return 0;
  if (num < 0) return -roundUp(-num, decimalPlaces);
  let factor = Math.pow(10, decimalPlaces);
  return (Math.ceil(num * factor) / factor).toFixed(decimalPlaces);
}

export function preciseAdd(a: number, b: number) {
  if (isNaN(a) || isNaN(b)) return null;
  // Находим максимальное количество знаков после запятой
  const factor = Math.pow(10, Math.max(countDecimals(a), countDecimals(b)));
  // Используем BigInt для сложения «копеек», чтобы избежать 0.30000000000000004
  const sum = BigInt(Math.round(a * factor)) + BigInt(Math.round(b * factor));
  return Number(sum) / factor;
}

export function preciseWithdraw(a: number, b: number) {
  if (isNaN(a) || isNaN(b)) return null;
  // Находим максимальное количество знаков после запятой
  const factor = Math.pow(10, Math.max(countDecimals(a), countDecimals(b)));
  let withdraw =
    BigInt(Math.round(a * factor)) - BigInt(Math.round(b * factor));
  return Number(withdraw) / factor;
}

function countDecimals(num: number) {
  if (!num) return 0;
  if (Math.floor(num) === num) return 0; // Для целых чисел
  return num.toString()?.split(".")?.[1]?.length || 0;
}

export function parseFloatFloor(num: number | string, decimalPlaces: number) {
  return Number.parseFloat(roundDown(Number(num), decimalPlaces));
}

export function parseFloatCeil(num: number | string, decimalPlaces: number) {
  return Number.parseFloat(roundUp(Number(num), decimalPlaces));
}
