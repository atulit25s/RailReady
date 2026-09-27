import { InspectionTemplate } from '../models/InspectionTemplate.js';
import { logAction } from '../services/auditService.js';

export const defaultChecklistItems = [
  // Mechanical
  { category: 'Mechanical', title: 'Brake System & Air Pressure', description: 'Check MR & BP pressures, auto-brake valve response, and leakage rate.' },
  { category: 'Mechanical', title: 'Wheel Flange & Tread Inspection', description: 'Visual check for flat spots, thermal cracks, flange wear, and gauge tolerance.' },
  { category: 'Mechanical', title: 'Center Pivot & Buffer Coupling', description: 'CBC coupler height, draft gear condition, knuckles, and lock pins.' },
  { category: 'Mechanical', title: 'Primary & Secondary Suspension Springs', description: 'Inspect coil/helical springs, dampers, and safety stops for cracks/shifts.' },
  { category: 'Mechanical', title: 'Axle Box & Speedometer Probe', description: 'Verify grease seals, temperature telltales, and grounding brush contacts.' },
  { category: 'Mechanical', title: 'Underframe Gear & Sanding Pipes', description: 'Ensure sanding nozzles alignment and pneumatic sandbox actuation.' },

  // Electrical
  { category: 'Electrical', title: 'Pantograph & Roof Bushings', description: 'Inspect carbon strip wear, pneumatic raise/lower time, and roof insulator glaze.' },
  { category: 'Electrical', title: 'Main Circuit Breaker (DJ / VCB)', description: 'Vacuum bottle condition, sequence operation, and auxiliary contacts.' },
  { category: 'Electrical', title: 'Traction Motors & Cables', description: 'Inspect nose suspension, cable cleating, bellows, and temperature sensors.' },
  { category: 'Electrical', title: 'Auxiliary Converters & Cooling Blowers', description: 'Check BUR1/BUR2/BUR3 operation, OCB oil flow, and filter cleanliness.' },
  { category: 'Electrical', title: 'Battery Bank Voltage & Electrolyte', description: 'Measure pilot cell voltage (>110V DC bus) and terminal tightness.' },
  { category: 'Electrical', title: 'Headlight, Marker & Flasher Lights', description: 'Verify twin-beam high/low lux, LED marker red/white toggle, and flasher circuit.' },

  // Safety
  { category: 'Safety', title: 'Twin-Tone Dual Horn System', description: 'Audible test of high and low tone horns from both driver and assistant desks.' },
  { category: 'Safety', title: 'Emergency Brake Valve & Trip Reset', description: 'Manual trip test of assistant emergency valve and deadman timer.' },
  { category: 'Safety', title: 'Modular Fire Extinguishers & Smoke Detector', description: 'Verify CO2 / DCP pressure gauges in green zone and expiry seals.' },
  { category: 'Safety', title: 'Vigilance Control Device (VCD)', description: 'Simulate 60s idle cycle and verify visual + acoustic alarm suppression.' },
  { category: 'Safety', title: 'Safety Chains, Skids & Fire Buckets', description: 'Presence of derailment recovery skids and emergency toolkits.' },

  // Cab
  { category: 'Cab', title: 'Driver Master Controller & Reverser', description: 'Smooth throttle notch transition, TE/BE limiters, and key interlock.' },
  { category: 'Cab', title: 'DDU Display Units & Speed Gauges', description: 'Check TFT display screens, node diagnostics, fault logging, and backlight.' },
  { category: 'Cab', title: 'VHF Walkie-Talkie & Cab Radio', description: 'Communication test with shed station controller on assigned frequency.' },
  { category: 'Cab', title: 'Pneumatic Wiper & Windshield Washer', description: 'Actuate wiper blade cycle and clean wiper fluid spray nozzles.' },
  { category: 'Cab', title: 'Cab HVAC Air Conditioner & Demister', description: 'Verify cab cooling/heating airflow and demister blowers for clear visibility.' }
];

// @desc    Get all inspection templates
// @route   GET /api/inspection-templates
// @access  Private
export const getTemplates = async (req, res, next) => {
  try {
    let templates = await InspectionTemplate.find();
    if (templates.length === 0) {
      const defaultTemplate = await InspectionTemplate.create({
        title: 'Standard Pre-Deployment Locomotive Checklist (ELS-STD-2026)',
        version: 'v2.4',
        isDefault: true,
        items: defaultChecklistItems
      });
      templates = [defaultTemplate];
    }
    res.status(200).json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
};

// @desc    Get default inspection template
// @route   GET /api/inspection-templates/default
// @access  Private
export const getDefaultTemplate = async (req, res, next) => {
  try {
    let template = await InspectionTemplate.findOne({ isDefault: true });
    if (!template) {
      template = await InspectionTemplate.create({
        title: 'Standard Pre-Deployment Locomotive Checklist (ELS-STD-2026)',
        version: 'v2.4',
        isDefault: true,
        items: defaultChecklistItems
      });
    }
    res.status(200).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
};
