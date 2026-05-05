export const LEVELS = [
  {
    name: 'Ratna Park Rush',
    district: 'Ratna Park to Asan',
    story: 'Maya starts with the morning office crowd. The alleys are tight, the fares are impatient, and every second matters.',
    length: 720,
    timeLimit: 88,
    passengerGoal: 4,
    traffic: 16,
    cows: 2,
    cyclists: 5,
    police: 2,
    hazards: { potholes: 2, puddles: 0, barriers: 1 },
    theme: 'market',
    routeBoard: 'Ratna Park',
    signs: ['Chiya', 'Momo', 'Asan'],
    landmarks: [
      { type: 'busPark', label: 'Ratna Bus Park', at: 0.18, side: -1 },
      { type: 'chowk', label: 'Asan Chowk', at: 0.54, side: 1 },
      { type: 'gateArch', label: 'Asan Gate', at: 0.82 }
    ],
    bonusObjectives: [
      { type: 'passengersBefore', landmark: 'Asan Chowk', count: 2, reward: 160, label: 'Board 2 passengers before Asan Chowk' },
      { type: 'speedThrough', landmark: 'Asan Gate', minSpeed: 18, reward: 130, label: 'Keep tempo above 18 through Asan Gate' }
    ],
    palette: {
      sky: 0xbfe7ff,
      fog: 0xd9f0ff,
      road: 0x30363a,
      accent: 0xf2c94c
    }
  },
  {
    name: 'Boudha Bell Run',
    district: 'Chabahil to Boudha',
    story: 'Temple bells roll through the traffic while tourists wave for rides. Smooth driving earns bigger tips.',
    length: 820,
    timeLimit: 96,
    passengerGoal: 5,
    traffic: 21,
    cows: 4,
    cyclists: 8,
    police: 3,
    hazards: { potholes: 4, puddles: 1, barriers: 1 },
    theme: 'stupa',
    routeBoard: 'Boudha',
    signs: ['Boudha', 'Thukpa', 'Thanka'],
    landmarks: [
      { type: 'gateArch', label: 'Boudha Gate', at: 0.2 },
      { type: 'temple', label: 'Boudha Stupa', at: 0.5, side: 1 },
      { type: 'chowk', label: 'Chabahil Chowk', at: 0.76, side: -1 }
    ],
    bonusObjectives: [
      { type: 'cleanSegment', landmark: 'Boudha Stupa', reward: 180, label: 'Reach Boudha Stupa without a collision' },
      { type: 'passengersBefore', landmark: 'Chabahil Chowk', count: 3, reward: 170, label: 'Board 3 passengers before Chabahil Chowk' }
    ],
    palette: {
      sky: 0xcdeedc,
      fog: 0xe5f6e9,
      road: 0x343737,
      accent: 0xd94f30
    }
  },
  {
    name: 'Patan Shortcut',
    district: 'Kupondole to Patan Durbar',
    story: 'A rival driver blocks the main road, so Maya dives into brick-lined shortcuts and keeps the route alive.',
    length: 940,
    timeLimit: 105,
    passengerGoal: 6,
    traffic: 27,
    cows: 5,
    cyclists: 10,
    police: 3,
    hazards: { potholes: 5, puddles: 1, barriers: 2 },
    theme: 'durbar',
    routeBoard: 'Patan',
    signs: ['Patan', 'Crafts', 'Juju Dhau'],
    landmarks: [
      { type: 'gateArch', label: 'Patan Gate', at: 0.22 },
      { type: 'chowk', label: 'Mangal Bazaar', at: 0.5, side: -1 },
      { type: 'temple', label: 'Durbar Temple', at: 0.78, side: 1 }
    ],
    bonusObjectives: [
      { type: 'cleanSegment', landmark: 'Mangal Bazaar', reward: 180, label: 'Reach Mangal Bazaar cleanly' },
      { type: 'comboBefore', landmark: 'Durbar Temple', combo: 3, reward: 210, label: 'Build a x3 combo before Durbar Temple' }
    ],
    palette: {
      sky: 0xffe4bf,
      fog: 0xffefd5,
      road: 0x383332,
      accent: 0x8f3f2d
    }
  },
  {
    name: 'Ring Road Monsoon',
    district: 'Kalanki to Balaju',
    story: 'Rain has turned potholes into small ponds. The tempo slides harder, but the bus stop is packed.',
    length: 1040,
    timeLimit: 114,
    passengerGoal: 7,
    traffic: 32,
    cows: 6,
    cyclists: 12,
    police: 4,
    wetRoad: true,
    hazards: { potholes: 5, puddles: 8, barriers: 3 },
    theme: 'monsoon',
    routeBoard: 'Ring Road',
    signs: ['Kalanki', 'Tyre Shop', 'Bus Stop'],
    landmarks: [
      { type: 'riverBridge', label: 'Bishnumati Bridge', at: 0.24 },
      { type: 'busPark', label: 'Kalanki Stop', at: 0.52, side: -1 },
      { type: 'gateArch', label: 'Ring Road Gate', at: 0.8 }
    ],
    bonusObjectives: [
      { type: 'cleanSegment', landmark: 'Bishnumati Bridge', reward: 240, label: 'Cross Bishnumati Bridge cleanly' },
      { type: 'passengersBefore', landmark: 'Kalanki Stop', count: 4, reward: 210, label: 'Board 4 passengers before Kalanki Stop' }
    ],
    palette: {
      sky: 0x9eb7c7,
      fog: 0xcad7df,
      road: 0x252b2f,
      accent: 0x31a3d6
    }
  },
  {
    name: 'Swayambhu Climb',
    district: 'Thamel to Swayambhu',
    story: 'The permit inspector is waiting uphill. One last climb decides whether Maya keeps the tempo on the road.',
    length: 1180,
    timeLimit: 128,
    passengerGoal: 8,
    traffic: 38,
    cows: 6,
    cyclists: 13,
    police: 5,
    hill: true,
    hazards: { potholes: 6, puddles: 2, barriers: 4 },
    theme: 'swayambhu',
    routeBoard: 'Swayambhu',
    signs: ['Thamel', 'Swayambhu', 'Lassi'],
    landmarks: [
      { type: 'chowk', label: 'Thamel Chowk', at: 0.18, side: 1 },
      { type: 'gateArch', label: 'Swayambhu Gate', at: 0.48 },
      { type: 'temple', label: 'Hill Stupa', at: 0.76, side: -1 }
    ],
    bonusObjectives: [
      { type: 'speedThrough', landmark: 'Swayambhu Gate', minSpeed: 17, reward: 220, label: 'Keep speed above 17 through Swayambhu Gate' },
      { type: 'cleanSegment', landmark: 'Hill Stupa', reward: 280, label: 'Reach Hill Stupa cleanly' }
    ],
    palette: {
      sky: 0xd7d0ff,
      fog: 0xe7e4ff,
      road: 0x292d35,
      accent: 0x62b15f
    }
  }
];

export const LANES = [-5.4, -2.7, 0, 2.7, 5.4];
