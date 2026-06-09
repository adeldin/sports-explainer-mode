'use client';

interface BaseballDiamondProps {
  runners: string[]; // ['1st', '2nd', '3rd']
  outs: number;
}

export default function BaseballDiamond({ runners, outs }: BaseballDiamondProps) {
  const hasRunner = (base: string) => runners.includes(base);
  
  return (
    <div className="relative w-48 h-48 mx-auto my-4">
      {/* Diamond shape */}
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Infield diamond */}
        <polygon
          points="50,10 90,50 50,90 10,50"
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="2"
          opacity="0.3"
        />
        
        {/* Home plate */}
        <circle
          cx="50"
          cy="90"
          r="5"
          fill={hasRunner('home') ? '#22c55e' : '#fff'}
          stroke="#000"
          strokeWidth="1"
        />
        <text x="50" y="95" textAnchor="middle" fontSize="6" fill="#000">H</text>
        
        {/* First base */}
        <circle
          cx="90"
          cy="50"
          r="5"
          fill={hasRunner('1st') ? '#22c55e' : '#fff'}
          stroke="#000"
          strokeWidth="1"
        />
        <text x="90" y="55" textAnchor="middle" fontSize="6" fill="#000">1</text>
        
        {/* Second base */}
        <circle
          cx="50"
          cy="10"
          r="5"
          fill={hasRunner('2nd') ? '#22c55e' : '#fff'}
          stroke="#000"
          strokeWidth="1"
        />
        <text x="50" y="15" textAnchor="middle" fontSize="6" fill="#000">2</text>
        
        {/* Third base */}
        <circle
          cx="10"
          cy="50"
          r="5"
          fill={hasRunner('3rd') ? '#22c55e' : '#fff'}
          stroke="#000"
          strokeWidth="1"
        />
        <text x="10" y="55" textAnchor="middle" fontSize="6" fill="#000">3</text>
      </svg>
      
      {/* Outs display */}
      <div className="text-center mt-2 text-sm font-semibold dark:text-white">
        {outs} {outs === 1 ? 'Out' : 'Outs'}
      </div>
    </div>
  );
}