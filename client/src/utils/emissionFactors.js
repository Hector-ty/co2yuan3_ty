// All factors are in tCO2 per unit, unless specified otherwise.
// Units for fuels are 't' for solid/liquid and 'm^3' for gas.

const factors = {
  // Solid Fuels (tCO2/t)
  solid: {
    anthracite: 2.50,
    bituminousCoal: 1.88,
    lignite: 0.97,
    cokingCoal: 2.61,
    briquettes: 2.22,
    coke: 2.61,
    otherCokingProducts: 2.61
  },
  // Liquid Fuels (tCO2/t)
  liquid: {
    crudeOil: 3.02,
    fuelOil: 3.17,
    gasoline: 3.02,
    diesel: 3.18,
    kerosene: 3.03,
    lpg: 3.16,
    lng: 3.11,
    naphtha: 3.02,
    asphalt: 3.31,
    lubricants: 3.09,
    petroleumCoke: 3.18,
    petrochemicalFeedstock: 3.09,
    otherOils: 3.09
  },
  // Gaseous Fuels (tCO2 / 10^4 Nm^3)
  gas: {
    naturalGas: 21.62,
    refineryGas: 26.11,
    cokeOvenGas: 8.36,
    pipelineGas: 5.00
  },
  // Indirect Emissions
  indirect: {
    // tCO2 / MWh
    electricity: 0.79, 
    // kgCO2e / GJ
    heat: 100 
  },
  // Mobile Sources
  mobile: {
    // kg CO2/L -> converted to tCO2/L in calculation
    fuel: {
      gasoline: 2.30,
      diesel: 2.63
    },
    // kg CO2/km -> converted to tCO2/km in calculation
    mileage: {
      // Using an average of the provided range
      gasolineCar: 0.15, // (0.12 + 0.18) / 2
      dieselCar: 0.14    // (0.10 + 0.18) / 2
    }
  }
};

export default factors;
