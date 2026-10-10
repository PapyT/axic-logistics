// Illustrative NGN rates. Change this file, then commit and redeploy to publish.
// All domestic routes share one band; these are not carrier-supplied prices.
export const pricing={
 currency:'NGN',
 bands:{
  domestic:{base:4500,perKg:450,handling:750},
  regional:{base:16000,perKg:1400,handling:2000},
  overseas:{base:35000,perKg:4500,handling:5000}
 },
 serviceMultipliers:{'Road freight':1,'Air express':2.8,'Ocean freight':0.7},
 volumetricDivisor:5000,
 protectionRate:0.025
} as const;
