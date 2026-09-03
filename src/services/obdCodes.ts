export interface ObdCodeDetail {
  code: string;
  title: string;
  category: 'Fuel & Air Metering' | 'Ignition System' | 'Emissions Control' | 'Auxiliary Emissions' | 'Vehicle Speed & Idle' | 'Computer & Output' | 'Transmission' | 'Hybrid / EV' | 'ABS & Chassis' | 'Body & Restraints' | 'CAN Network & Comm';
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  description: string;
  symptoms: string[];
  probableCauses: string[];
  recommendedParts: string[];
}

export const COMMON_OBD_CODES: Record<string, ObdCodeDetail> = {
  P0171: {
    code: 'P0171',
    title: 'System Too Lean (Bank 1)',
    category: 'Fuel & Air Metering',
    severity: 'Moderate',
    description: 'The engine control module (ECM) detects too much oxygen in the exhaust or inadequate fuel delivery on Bank 1.',
    symptoms: ['Check Engine Light', 'Engine hesitation or stumble', 'Rough engine idle', 'Reduced fuel economy', 'Lack of power during acceleration'],
    probableCauses: ['Mass Airflow (MAF) sensor contaminated or faulty', 'Vacuum leak in intake manifold or PCV hoses', 'Weak fuel pump or clogged fuel filter', 'Faulty fuel injectors', 'Upstream Oxygen Sensor (O2) reading incorrectly'],
    recommendedParts: ['Mass Airflow (MAF) Sensor', 'Upstream O2 Sensor (Bank 1)', 'Intake Manifold Gasket Set', 'PCV Valve & Hose', 'Fuel Filter'],
  },
  P0174: {
    code: 'P0174',
    title: 'System Too Lean (Bank 2)',
    category: 'Fuel & Air Metering',
    severity: 'Moderate',
    description: 'The engine control module detects too much oxygen in the exhaust on Bank 2 of a V6/V8 engine.',
    symptoms: ['Check Engine Light', 'Engine hesitation', 'Rough idle', 'Poor acceleration', 'Misfires under load'],
    probableCauses: ['Intake vacuum leak', 'Dirty/failing MAF sensor', 'Low fuel rail pressure', 'Clogged fuel injector on Bank 2', 'Upstream O2 sensor fault'],
    recommendedParts: ['Mass Airflow (MAF) Sensor', 'Upstream O2 Sensor (Bank 2)', 'Intake Plenum Gasket', 'Fuel Injector Cleaner / Injector'],
  },
  P0172: {
    code: 'P0172',
    title: 'System Too Rich (Bank 1)',
    category: 'Fuel & Air Metering',
    severity: 'Moderate',
    description: 'The ECM detects too much fuel or inadequate air in the combustion mixture on Bank 1.',
    symptoms: ['Strong fuel smell from exhaust', 'Black exhaust smoke', 'Reduced fuel mileage', 'Engine fouling / misfiring'],
    probableCauses: ['Stuck open fuel injector', 'Faulty Fuel Pressure Regulator', 'Contaminated MAF sensor', 'Leaking EVAP purge valve', 'Restricted engine air intake'],
    recommendedParts: ['Engine Air Filter', 'Mass Airflow (MAF) Sensor', 'EVAP Purge Solenoid', 'Fuel Pressure Regulator', 'Oxygen Sensor (Bank 1 Sensor 1)'],
  },
  P0300: {
    code: 'P0300',
    title: 'Random / Multiple Cylinder Misfire Detected',
    category: 'Ignition System',
    severity: 'High',
    description: 'The ECM detects misfires occurring across multiple random cylinders, which can overheat the catalytic converter.',
    symptoms: ['Flashing or solid Check Engine Light', 'Noticeable engine shaking/vibration', 'Severe loss of power', 'Hard starting or stalling', 'Rotten egg sulfur exhaust odor'],
    probableCauses: ['Worn spark plugs or bad plug gap', 'Failing ignition coil packs or plug wires', 'Low fuel pressure or dirty injectors', 'Intake vacuum leak', 'Low engine compression'],
    recommendedParts: ['Spark Plug Set', 'Ignition Coil Pack Set', 'Ignition Wire Set', 'Fuel Filter', 'Crankshaft Position Sensor'],
  },
  P0301: {
    code: 'P0301',
    title: 'Cylinder 1 Misfire Detected',
    category: 'Ignition System',
    severity: 'High',
    description: 'Combustion misfire specifically isolated to Cylinder #1.',
    symptoms: ['Engine jerking/shaking', 'Lack of acceleration', 'Flashing Check Engine Light under load'],
    probableCauses: ['Bad Cylinder 1 spark plug', 'Defective Cylinder 1 ignition coil pack', 'Clogged Cylinder 1 fuel injector', 'Cylinder 1 compression loss'],
    recommendedParts: ['Spark Plug (Cylinder 1)', 'Ignition Coil Pack (Cylinder 1)', 'Fuel Injector (Cylinder 1)'],
  },
  P0302: {
    code: 'P0302',
    title: 'Cylinder 2 Misfire Detected',
    category: 'Ignition System',
    severity: 'High',
    description: 'Combustion misfire specifically isolated to Cylinder #2.',
    symptoms: ['Engine jerking/shaking', 'Loss of engine power', 'Rough idle'],
    probableCauses: ['Worn spark plug #2', 'Failing ignition coil #2', 'Faulty injector #2', 'Intake gasket leak near runner 2'],
    recommendedParts: ['Spark Plug (Cylinder 2)', 'Ignition Coil Pack (Cylinder 2)', 'Fuel Injector'],
  },
  P0303: {
    code: 'P0303',
    title: 'Cylinder 3 Misfire Detected',
    category: 'Ignition System',
    severity: 'High',
    description: 'Combustion misfire specifically isolated to Cylinder #3.',
    symptoms: ['Engine stumble', 'Check Engine Light', 'Rough acceleration'],
    probableCauses: ['Defective spark plug #3', 'Failed coil on plug #3', 'Wiring fault to injector #3'],
    recommendedParts: ['Spark Plug (Cylinder 3)', 'Ignition Coil Pack (Cylinder 3)', 'Fuel Injector'],
  },
  P0304: {
    code: 'P0304',
    title: 'Cylinder 4 Misfire Detected',
    category: 'Ignition System',
    severity: 'High',
    description: 'Combustion misfire specifically isolated to Cylinder #4.',
    symptoms: ['Engine stumble under load', 'Flashing Check Engine Light', 'Excess vibration'],
    probableCauses: ['Worn spark plug #4', 'Bad ignition coil #4', 'Injector harness or injector failure'],
    recommendedParts: ['Spark Plug (Cylinder 4)', 'Ignition Coil Pack (Cylinder 4)', 'Fuel Injector'],
  },
  P0420: {
    code: 'P0420',
    title: 'Catalytic Converter System Efficiency Below Threshold (Bank 1)',
    category: 'Emissions Control',
    severity: 'Moderate',
    description: 'The catalytic converter is not operating at peak efficiency to scrub hydrocarbons and carbon monoxide on Bank 1.',
    symptoms: ['Check Engine Light illuminated', 'Slight loss of power at highway speeds', 'Failed state emissions / smog inspection', 'Rotten egg exhaust smell'],
    probableCauses: ['Catalyzed substrate degradation/melted converter', 'Exhaust leak before downstream O2 sensor', 'Defective Downstream Oxygen Sensor (Sensor 2)', 'Engine oil burning or unburnt fuel passing into exhaust'],
    recommendedParts: ['Direct-Fit Catalytic Converter (Bank 1)', 'Downstream O2 Sensor (Bank 1 Sensor 2)', 'Exhaust Flange Gaskets', 'Upstream O2 Sensor'],
  },
  P0430: {
    code: 'P0430',
    title: 'Catalytic Converter System Efficiency Below Threshold (Bank 2)',
    category: 'Emissions Control',
    severity: 'Moderate',
    description: 'The catalytic converter efficiency on Bank 2 is below minimum emissions thresholds.',
    symptoms: ['Check Engine Light', 'Failed emissions test', 'Hissing exhaust leak'],
    probableCauses: ['Failing Bank 2 catalytic converter', 'Exhaust manifold crack or gasket leak', 'Faulty Bank 2 downstream oxygen sensor'],
    recommendedParts: ['Catalytic Converter (Bank 2)', 'Downstream O2 Sensor (Bank 2 Sensor 2)', 'Exhaust Manifold Gasket'],
  },
  P0442: {
    code: 'P0442',
    title: 'EVAP Control System Leak Detected (Small Leak)',
    category: 'Auxiliary Emissions',
    severity: 'Low',
    description: 'The Evaporative Emission Control System has detected a small vapor leak (typically ~0.040 inch hole).',
    symptoms: ['Check Engine Light', 'Faint fuel vapor smell near rear of vehicle', 'Failed EVAP readiness test'],
    probableCauses: ['Loose, cracked, or worn fuel filler gas cap', 'Cracked EVAP vapor canister hose', 'Stuck open EVAP canister vent solenoid', 'Faulty EVAP purge valve'],
    recommendedParts: ['OEM Fuel Tank Gas Cap', 'EVAP Purge Valve Solenoid', 'EVAP Canister Vent Valve', 'Vapor Canister'],
  },
  P0455: {
    code: 'P0455',
    title: 'EVAP Control System Leak Detected (Gross / Large Leak)',
    category: 'Auxiliary Emissions',
    severity: 'Moderate',
    description: 'A major evaporative emission vapor leak detected (typically gas cap completely missing/untightened or disconnected line).',
    symptoms: ['Check Engine Light', 'Noticeable fuel odor', 'Fuel cap warning light on instrument cluster'],
    probableCauses: ['Gas cap missing, loose, or defective seal', 'Disconnected or severed EVAP vacuum line', 'Faulty EVAP vent control solenoid', 'Cracked charcoal vapor canister'],
    recommendedParts: ['Replacement Gas Cap', 'EVAP Purge Valve', 'EVAP Vent Valve Solenoid', 'Charcoal Vapor Canister'],
  },
  P0456: {
    code: 'P0456',
    title: 'EVAP Control System Leak Detected (Very Small Leak)',
    category: 'Auxiliary Emissions',
    severity: 'Low',
    description: 'A micro evaporative leak (typically ~0.020 inch) detected during ECM EVAP vacuum decay test.',
    symptoms: ['Check Engine Light', 'Intermittent EVAP monitor failure'],
    probableCauses: ['Debris or hairline crack on gas cap O-ring', 'Purge valve internal seal weeping', 'Fuel filler neck corrosion/scratch'],
    recommendedParts: ['Gas Cap with Viton Seal', 'EVAP Purge Solenoid Valve', 'Fuel Filler Neck Assembly'],
  },
  P0128: {
    code: 'P0128',
    title: 'Coolant Thermostat - Coolant Temp Below Regulating Temperature',
    category: 'Fuel & Air Metering',
    severity: 'Moderate',
    description: 'The engine coolant has not reached operating temperature (typically 180°F-195°F) within specified warm-up time.',
    symptoms: ['Check Engine Light', 'Heater blows warm/lukewarm instead of hot', 'Engine temperature gauge stays low', 'Slightly reduced fuel economy'],
    probableCauses: ['Thermostat stuck open or opening too early', 'Faulty Engine Coolant Temperature (ECT) sensor', 'Low engine coolant level', 'Cooling fan running continuously'],
    recommendedParts: ['Engine Coolant Thermostat & Gasket', 'Engine Coolant Temperature (ECT) Sensor', '50/50 Antifreeze / Coolant'],
  },
  P0101: {
    code: 'P0101',
    title: 'Mass or Volume Air Flow Circuit Range / Performance',
    category: 'Fuel & Air Metering',
    severity: 'Moderate',
    description: 'MAF sensor signal does not correlate with throttle position and RPM expectations.',
    symptoms: ['Hesitation under acceleration', 'Engine stalling when stopping', 'Black smoke from exhaust', 'Hard starting'],
    probableCauses: ['Dirty MAF sensor sensing wire', 'Torn intake air boot/duct', 'Clogged engine air filter', 'Defective MAF sensor element'],
    recommendedParts: ['Mass Airflow (MAF) Sensor', 'Engine Air Filter', 'Intake Air Duct Hose', 'MAF Sensor Cleaner Spray'],
  },
  P0401: {
    code: 'P0401',
    title: 'Exhaust Gas Recirculation (EGR) Flow Insufficient',
    category: 'Auxiliary Emissions',
    severity: 'Moderate',
    description: 'The ECM commanded EGR flow, but the pressure sensor detected inadequate reduction in intake manifold vacuum or pressure.',
    symptoms: ['Engine pinging/knocking under load', 'Check Engine Light', 'Rough idle or hesitation'],
    probableCauses: ['EGR valve passages clogged with carbon', 'Faulty EGR valve', 'Defective EGR pressure sensor (DPFE)', 'Broken vacuum line to EGR'],
    recommendedParts: ['EGR Valve & Gasket', 'EGR Pressure Feedback Sensor (DPFE)', 'EGR Vacuum Solenoid'],
  },
  P0135: {
    code: 'P0135',
    title: 'O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 1)',
    category: 'Emissions Control',
    severity: 'Low',
    description: 'The internal heater element inside the upstream Bank 1 oxygen sensor has failed or has open circuit.',
    symptoms: ['Check Engine Light', 'Slow transition to closed-loop fuel control', 'Slightly increased cold-start emissions'],
    probableCauses: ['Blown O2 heater fuse', 'Damaged O2 sensor wiring harness', 'Internal heater element burned out in sensor'],
    recommendedParts: ['Upstream Oxygen Sensor (Bank 1 Sensor 1)', 'O2 Sensor Connector / Fuse'],
  },
  P0500: {
    code: 'P0500',
    title: 'Vehicle Speed Sensor (VSS) Malfunction',
    category: 'Vehicle Speed & Idle',
    severity: 'High',
    description: 'The ECM is not receiving a valid speed signal from the transmission or output speed sensor.',
    symptoms: ['Speedometer erratic or inoperative', 'Harsh automatic transmission shifts', 'ABS or Traction Control warning light', 'Cruise control disabled'],
    probableCauses: ['Faulty Vehicle Speed Sensor', 'Damaged speed sensor wiring or connector', 'Damaged speed sensor reluctor ring in transmission'],
    recommendedParts: ['Vehicle Speed Sensor (VSS)', 'Transmission Output Speed Sensor'],
  },
  P0700: {
    code: 'P0700',
    title: 'Transmission Control System (TCM) Malfunction Indicator',
    category: 'Transmission',
    severity: 'High',
    description: 'The Transmission Control Module (TCM) has requested the ECM to illuminate the Check Engine Light due to a transmission fault.',
    symptoms: ['Transmission slipping or stuck in limp mode (e.g. 3rd gear)', 'Harsh gear engagement', 'No overdrive'],
    probableCauses: ['Transmission shift solenoid failure', 'Low transmission fluid or dirty fluid', 'Torque converter lockup clutch issue', 'Internal transmission mechanical wear'],
    recommendedParts: ['Automatic Transmission Fluid & Filter Kit', 'Transmission Shift Solenoid Pack', 'TCM Harness Connector'],
  },
  P0011: {
    code: 'P0011',
    title: 'Camshaft Position "A" - Timing Over-Advanced or System Performance (Bank 1)',
    category: 'Fuel & Air Metering',
    severity: 'High',
    description: 'Variable Valve Timing (VVT) camshaft advance on Bank 1 intake is out of sync with ECM commanded position.',
    symptoms: ['Engine rattling on startup', 'Loss of engine power', 'Rough idle', 'Engine stalling'],
    probableCauses: ['Low engine oil level or dirty engine oil', 'Clogged VVT oil control solenoid screen', 'Faulty VVT solenoid valve', 'Stretched timing chain or worn tensioner'],
    recommendedParts: ['Variable Valve Timing (VVT) Solenoid', 'Engine Oil & Filter Change Kit', 'Camshaft Position Sensor', 'Timing Chain Kit'],
  },
  P0014: {
    code: 'P0014',
    title: 'Camshaft Position "B" - Timing Over-Advanced (Bank 1)',
    category: 'Fuel & Air Metering',
    severity: 'High',
    description: 'Exhaust camshaft timing over-advanced on Bank 1.',
    symptoms: ['Engine rattling noise', 'Poor low-end torque', 'Check Engine Light'],
    probableCauses: ['Contaminated engine oil', 'Failed exhaust VVT solenoid', 'Timing chain tensioner failure'],
    recommendedParts: ['Exhaust VVT Solenoid', 'Camshaft Position Sensor', 'Engine Oil Filter'],
  },
  P0016: {
    code: 'P0016',
    title: 'Crankshaft Position - Camshaft Position Correlation (Bank 1 Sensor A)',
    category: 'Computer & Output',
    severity: 'Critical',
    description: 'The correlation between the crankshaft sensor and camshaft sensor is out of mechanical alignment.',
    symptoms: ['Engine hard start or no-start', 'Severe lack of engine power', 'Engine backfire or rattling chain noise'],
    probableCauses: ['Stretched or jumped timing chain/belt', 'Worn timing chain guides/tensioners', 'Faulty crankshaft position sensor', 'Damaged reluctor wheel'],
    recommendedParts: ['Complete Timing Chain Kit with Guides & Tensioner', 'Crankshaft Position Sensor', 'Camshaft Position Sensor'],
  },
  C0035: {
    code: 'C0035',
    title: 'Left Front Wheel Speed Sensor Circuit Malfunction',
    category: 'ABS & Chassis',
    severity: 'High',
    description: 'The Anti-Lock Brake (ABS) / Traction Control module detected an open, short, or missing pulse on the left front wheel speed sensor.',
    symptoms: ['ABS warning light illuminated', 'Traction Control / StabiliTrak light on', 'ABS pulsation during normal low-speed braking'],
    probableCauses: ['Damaged ABS wheel speed sensor wire harness', 'Failed wheel speed sensor magnetic pickup', 'Rusted or damaged tone ring on hub bearing'],
    recommendedParts: ['Left Front ABS Wheel Speed Sensor', 'Front Wheel Hub & Bearing Assembly with Integrated ABS'],
  },
  C0040: {
    code: 'C0040',
    title: 'Right Front Wheel Speed Sensor Circuit Malfunction',
    category: 'ABS & Chassis',
    severity: 'High',
    description: 'Right front wheel speed sensor circuit failure.',
    symptoms: ['ABS and Traction Control lights on', 'Hill assist disabled'],
    probableCauses: ['Faulty right front speed sensor', 'Debris or metal shavings on magnetic sensor tip', 'Worn hub bearing'],
    recommendedParts: ['Right Front ABS Wheel Speed Sensor', 'Wheel Hub Bearing Assembly'],
  },
  U0100: {
    code: 'U0100',
    title: 'Lost Communication with Engine Control Module (ECM / PCM)',
    category: 'CAN Network & Comm',
    severity: 'Critical',
    description: 'Other control modules on the high-speed CAN bus (TCM, ABS, BCM) have lost communication with the main Engine Control Module.',
    symptoms: ['Multiple warning lights (Check Engine, ABS, Airbag, Transmission)', 'No-crank / no-start condition', 'Transmission in limp mode', 'Gauges sweeping or dead'],
    probableCauses: ['Corroded ECM ground wire or blown ECM power fuse', 'Weak or dead 12V battery', 'Short or open in CAN High / CAN Low wiring bus', 'Failed ECM module'],
    recommendedParts: ['Automotive 12V Battery', 'Main ECM Power Relay', 'Battery Terminal Cable Clamps'],
  },
  U0101: {
    code: 'U0101',
    title: 'Lost Communication with Transmission Control Module (TCM)',
    category: 'CAN Network & Comm',
    severity: 'High',
    description: 'Loss of high-speed CAN bus communication with the Transmission Control Module.',
    symptoms: ['Transmission locked in default 3rd gear', 'PRNDL shift indicator flashing or blank', 'Check Engine Light'],
    probableCauses: ['TCM power relay or fuse blown', 'Damaged wiring harness near transmission pan', 'Failed TCM module'],
    recommendedParts: ['Transmission Control Module (TCM)', 'TCM Power Relay'],
  },
  B0001: {
    code: 'B0001',
    title: 'Driver Airbag Stage 1 Deployment Control Malfunction',
    category: 'Body & Restraints',
    severity: 'Critical',
    description: 'Supplemental Restraint System (SRS) detected circuit open or resistance out of range for driver steering wheel airbag.',
    symptoms: ['Airbag / SRS warning light on instrument cluster', 'Horn or steering wheel buttons intermittent'],
    probableCauses: ['Broken clock spring (spiral cable) in steering column', 'Damaged airbag connector yellow wiring', 'Defective airbag squib module'],
    recommendedParts: ['Steering Column Clock Spring (Spiral Cable)', 'Airbag Module Wiring Harness'],
  },
};

// Generic parser for any OBD-II code structure
export function parseObdCode(rawCode: string): ObdCodeDetail {
  const code = rawCode.trim().toUpperCase();

  // If we have an exact match in our database
  if (COMMON_OBD_CODES[code]) {
    return COMMON_OBD_CODES[code];
  }

  // Otherwise, parse by standard SAE J2019 / ISO OBD-II format:
  // First Char: P = Powertrain, C = Chassis, B = Body, U = Network
  // Second Char: 0 = Generic / Standard, 1 = Manufacturer Specific, 2/3 = Extended
  // Third Char: Subsystem (1-2 Fuel/Air, 3 Ignition, 4 Emissions, 5 Speed/Idle, 6 Computer, 7-8 Transmission)
  const firstChar = code.charAt(0);
  const secondChar = code.charAt(1);
  const thirdChar = code.charAt(2);

  let category: ObdCodeDetail['category'] = 'Computer & Output';
  let title = `Generic Diagnostic Trouble Code (${code})`;
  let severity: ObdCodeDetail['severity'] = 'Moderate';
  let description = 'Standard OBD-II Diagnostic Trouble Code.';
  const symptoms: string[] = ['Check Engine or Warning Light illuminated'];
  const probableCauses: string[] = ['Sensor reading out of normal operating range', 'Wiring harness / connector corrosion or loose pin', 'Component mechanical failure'];
  const recommendedParts: string[] = ['Diagnostic Sensor / Component replacement'];

  if (firstChar === 'P') {
    if (thirdChar === '1' || thirdChar === '2') {
      category = 'Fuel & Air Metering';
      title = `Powertrain: Fuel & Air Metering Fault (${code})`;
      symptoms.push('Engine performance or fuel trim deviation', 'Rough idle or hesitation');
      probableCauses.push('Vacuum leak', 'Airflow/pressure sensor issue', 'Fuel delivery pressure fault');
      recommendedParts.push('Fuel Filter', 'MAF / MAP Sensor', 'Intake Gasket');
    } else if (thirdChar === '3') {
      category = 'Ignition System';
      title = `Powertrain: Ignition System or Misfire Fault (${code})`;
      severity = 'High';
      symptoms.push('Engine misfire, vibration, or lack of power');
      probableCauses.push('Spark plug deterioration', 'Ignition coil failure');
      recommendedParts.push('Spark Plugs', 'Ignition Coils');
    } else if (thirdChar === '4') {
      category = 'Auxiliary Emissions';
      title = `Powertrain: Auxiliary Emissions Fault (${code})`;
      symptoms.push('Emissions inspection failure', 'EVAP / EGR / Secondary Air system fault');
      probableCauses.push('EVAP solenoid leak', 'EGR valve blockage', 'Oxygen sensor aging');
      recommendedParts.push('EVAP Purge Solenoid', 'O2 Sensor', 'Gas Cap');
    } else if (thirdChar === '5') {
      category = 'Vehicle Speed & Idle';
      title = `Powertrain: Vehicle Speed & Idle Control (${code})`;
      symptoms.push('Unstable idle RPM or cruise control inoperative');
      probableCauses.push('Idle air control valve', 'Throttle body carbon buildup', 'Speed sensor');
      recommendedParts.push('Idle Air Control Valve', 'Speed Sensor');
    } else if (thirdChar === '7' || thirdChar === '8' || thirdChar === '9') {
      category = 'Transmission';
      title = `Powertrain: Transmission Control System (${code})`;
      severity = 'High';
      symptoms.push('Harsh shifting, slipping, or gear ratio error');
      probableCauses.push('Transmission solenoid', 'Fluid level / pressure', 'Torque converter clutch');
      recommendedParts.push('Transmission Filter & Fluid', 'Shift Solenoid');
    } else {
      category = 'Fuel & Air Metering';
      title = `Powertrain System Trouble Code (${code})`;
    }
  } else if (firstChar === 'C') {
    category = 'ABS & Chassis';
    title = `Chassis / ABS / Suspension Fault (${code})`;
    severity = 'High';
    symptoms.push('ABS or Stability Control light on', 'Reduced braking assistance');
    probableCauses.push('Wheel speed sensor', 'Brake pressure sensor', 'Steering angle sensor');
    recommendedParts.push('ABS Wheel Speed Sensor', 'Wheel Hub Assembly');
  } else if (firstChar === 'B') {
    category = 'Body & Restraints';
    title = `Body / Airbag / Electrical System Fault (${code})`;
    severity = 'Moderate';
    symptoms.push('SRS Airbag warning or body electrical malfunction');
    probableCauses.push('Switch failure', 'Wiring harness pin corrosion', 'Restraint sensor');
    recommendedParts.push('Clock Spring / Switch', 'Body Module Relay');
  } else if (firstChar === 'U') {
    category = 'CAN Network & Comm';
    title = `CAN Bus / Controller Network Communication Fault (${code})`;
    severity = 'Critical';
    symptoms.push('Multiple system warning lights', 'Intermittent loss of bus data');
    probableCauses.push('CAN High / Low wiring short or open', 'Module power or ground loss', 'Defective control module');
    recommendedParts.push('Automotive 12V Battery', 'Main System Relay');
  }

  if (secondChar === '1' || secondChar === '3') {
    description += ' Note: This is an enhanced manufacturer-specific code (OEM defined).';
  }

  return {
    code,
    title,
    category,
    severity,
    description,
    symptoms,
    probableCauses,
    recommendedParts,
  };
}

// Search utility across codes, titles, symptoms, and keywords
export function searchObdCodes(query: string): ObdCodeDetail[] {
  const clean = query.trim().toUpperCase();
  if (!clean) return Object.values(COMMON_OBD_CODES);

  // Exact code match
  if (COMMON_OBD_CODES[clean]) {
    return [COMMON_OBD_CODES[clean]];
  }

  // Filter existing known codes
  const matched = Object.values(COMMON_OBD_CODES).filter((item) => {
    return (
      item.code.includes(clean) ||
      item.title.toUpperCase().includes(clean) ||
      item.category.toUpperCase().includes(clean) ||
      item.symptoms.some((s) => s.toUpperCase().includes(clean)) ||
      item.probableCauses.some((c) => c.toUpperCase().includes(clean)) ||
      item.recommendedParts.some((p) => p.toUpperCase().includes(clean))
    );
  });

  // If code format looks like an OBD code (e.g. P1234, C0035) but not in standard map, parse dynamically
  if (/^[PBCU][0-9A-F]{4}$/i.test(clean) && matched.length === 0) {
    matched.push(parseObdCode(clean));
  }

  return matched;
}
