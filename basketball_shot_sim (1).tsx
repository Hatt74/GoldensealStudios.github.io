import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Info, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BasketballCourtSimulator = () => {
  const canvasRef = useRef(null);
  const [shotPosition, setShotPosition] = useState(null);
  const [probability, setProbability] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [shotCount, setShotCount] = useState(10);
  const [results, setResults] = useState(null);
  const [showGraph, setShowGraph] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [targetBasket, setTargetBasket] = useState('left');
  
  // NBA court dimensions in feet
  const COURT_LENGTH = 94;
  const COURT_WIDTH = 50;
  const THREE_POINT_LINE = 23.75;
  const THREE_POINT_ARC = 22;
  const KEY_WIDTH = 16;
  const BASKET_POSITION = 5.25;
  
  const SCALE = 7;
  const CANVAS_WIDTH = COURT_LENGTH * SCALE;
  const CANVAS_HEIGHT = COURT_WIDTH * SCALE;

  const calculateProbability = (x, y, basket) => {
    const basketX = basket === 'left' ? BASKET_POSITION * SCALE : CANVAS_WIDTH - BASKET_POSITION * SCALE;
    const basketY = (COURT_WIDTH / 2) * SCALE;
    
    const distX = (x - basketX) / SCALE;
    const distY = (y - basketY) / SCALE;
    const distance = Math.sqrt(distX * distX + distY * distY);
    
    let baseProb = 0;
    let zone = "";
    
    if (distance < 3) {
      baseProb = 63;
      zone = "Restricted Area";
    }
    else if (distance < 8) {
      baseProb = 42;
      zone = "Paint";
    }
    else if (distance < 16) {
      baseProb = 40;
      zone = "Mid-Range";
    }
    else if (distance < THREE_POINT_LINE) {
      baseProb = 38;
      zone = "Long Mid-Range";
    }
    else if (distance < 47) {
      const isCorner = Math.abs(distY) > 14 && distance < 28;
      if (isCorner) {
        baseProb = 39;
        zone = "Corner Three";
      } else if (distance < 28) {
        baseProb = 36;
        zone = "Three-Point";
      } else if (distance < 35) {
        baseProb = 25;
        zone = "Deep Three";
      } else {
        baseProb = 15;
        zone = "Half Court Range";
      }
      
      if (distance > 28) {
        baseProb -= (distance - 28) * 0.8;
      }
    }
    else {
      baseProb = 5;
      zone = "Full Court";
      if (distance > 70) {
        baseProb = 2;
      }
    }
    
    const angleFromCenter = Math.abs(Math.atan2(distY, distX));
    if (angleFromCenter > Math.PI / 4 && distance > 10 && distance < 30) {
      baseProb += 2;
    }
    
    return {
      probability: Math.max(1, Math.min(95, baseProb)),
      distance: distance.toFixed(1),
      zone: zone
    };
  };

  const drawCourt = (ctx) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#d2691e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 6 * SCALE, 0, 2 * Math.PI);
    ctx.stroke();
    
    drawHalfCourt(ctx, true);
    drawHalfCourt(ctx, false);
    
    if (shotPosition) {
      ctx.fillStyle = '#00ff00';
      ctx.strokeStyle = '#003300';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(shotPosition.x, shotPosition.y, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      
      const basketX = targetBasket === 'left' ? BASKET_POSITION * SCALE : CANVAS_WIDTH - BASKET_POSITION * SCALE;
      const basketY = CANVAS_HEIGHT / 2;
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(basketX, basketY);
      ctx.lineTo(shotPosition.x, shotPosition.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const drawHalfCourt = (ctx, isLeft) => {
    const basketX = isLeft ? BASKET_POSITION * SCALE : CANVAS_WIDTH - BASKET_POSITION * SCALE;
    const basketY = CANVAS_HEIGHT / 2;
    const baselineX = isLeft ? 0 : CANVAS_WIDTH;
    
    ctx.save();
    
    if (!isLeft) {
      ctx.translate(CANVAS_WIDTH, 0);
      ctx.scale(-1, 1);
    }
    
    const drawX = 0;
    const drawBasketX = BASKET_POSITION * SCALE;
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const keyY = (CANVAS_HEIGHT - KEY_WIDTH * SCALE) / 2;
    ctx.strokeRect(drawX, keyY, 19 * SCALE, KEY_WIDTH * SCALE);
    
    ctx.beginPath();
    const ftX = 19 * SCALE;
    ctx.moveTo(ftX, keyY);
    ctx.lineTo(ftX, keyY + KEY_WIDTH * SCALE);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(ftX, basketY, 6 * SCALE, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(drawBasketX, basketY, 4 * SCALE, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();
    
    ctx.beginPath();
    const corner3Distance = 14;
    const cornerY1 = (CANVAS_HEIGHT / 2) - corner3Distance * SCALE;
    const cornerY2 = (CANVAS_HEIGHT / 2) + corner3Distance * SCALE;
    
    ctx.moveTo(drawX, cornerY1);
    ctx.lineTo(THREE_POINT_LINE * SCALE - (THREE_POINT_ARC * SCALE - (THREE_POINT_ARC - BASKET_POSITION) * SCALE), cornerY1);
    
    const angle1 = -Math.atan2(corner3Distance, THREE_POINT_ARC - BASKET_POSITION);
    const angle2 = Math.atan2(corner3Distance, THREE_POINT_ARC - BASKET_POSITION);
    ctx.arc(drawBasketX, basketY, THREE_POINT_ARC * SCALE, angle1, angle2, false);
    
    ctx.lineTo(drawX, cornerY2);
    ctx.stroke();
    
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(drawBasketX, basketY, 4, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(drawX, basketY - 15);
    ctx.lineTo(drawX, basketY + 15);
    ctx.stroke();
    
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawCourt(ctx);
    }
  }, [shotPosition, targetBasket]);

  useEffect(() => {
    if (shotPosition) {
      const result = calculateProbability(shotPosition.x, shotPosition.y, targetBasket);
      setProbability(result);
    }
  }, [shotPosition, targetBasket]);

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    
    if (shotPosition) {
      const dist = Math.sqrt((x - shotPosition.x) ** 2 + (y - shotPosition.y) ** 2);
      if (dist < 15) {
        setIsDragging(true);
        return;
      }
    }
    
    setShotPosition({ x, y });
    setResults(null);
    setShowGraph(false);
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDragging) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    
    const clampedX = Math.max(0, Math.min(CANVAS_WIDTH, x));
    const clampedY = Math.max(0, Math.min(CANVAS_HEIGHT, y));
    
    setShotPosition({ x: clampedX, y: clampedY });
    setResults(null);
    setShowGraph(false);
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const simulateShots = () => {
    if (!probability) return;
    
    const shotData = [];
    let cumulativeMade = 0;
    let cumulativeMissed = 0;
    
    for (let i = 1; i <= shotCount; i++) {
      const random = Math.random() * 100;
      if (random < probability.probability) {
        cumulativeMade++;
      } else {
        cumulativeMissed++;
      }
      
      shotData.push({
        shot: i,
        made: cumulativeMade,
        missed: cumulativeMissed,
        percentage: ((cumulativeMade / i) * 100).toFixed(1)
      });
    }
    
    setResults({
      made: cumulativeMade,
      missed: cumulativeMissed,
      chartData: shotData
    });
    setShowGraph(true);
  };

  const handleReset = () => {
    setShotPosition(null);
    setProbability(null);
    setResults(null);
    setShowGraph(false);
  };

  const handleBasketSwitch = (basket) => {
    setTargetBasket(basket);
    setResults(null);
    setShowGraph(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-800 rounded-xl shadow-2xl p-6 border border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">NBA Shot Simulator</h1>
              <p className="text-slate-400">Click anywhere on the court or drag the marker to move it</p>
            </div>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <Info className="text-white" size={24} />
            </button>
          </div>

          {showInfo && (
            <div className="mb-6 p-4 bg-slate-700 rounded-lg text-slate-300 text-sm">
              <h3 className="font-bold text-white mb-2">Court Specifications (NBA Official):</h3>
              <ul className="space-y-1">
                <li>• Court: 94' × 50'</li>
                <li>• Three-point line: 22' at arc, 23.75' at corners</li>
                <li>• Key width: 16'</li>
                <li>• Basket: 5.25' from baseline</li>
              </ul>
              <h3 className="font-bold text-white mt-3 mb-2">Shot Probabilities:</h3>
              <ul className="space-y-1">
                <li>• Restricted Area (0-3'): ~63%</li>
                <li>• Paint (3-8'): ~42%</li>
                <li>• Mid-Range (8-16'): ~40%</li>
                <li>• Corner Three: ~39%</li>
                <li>• Three-Point: ~36%</li>
                <li>• Deep Three (28-35'): ~15-25%</li>
                <li>• Half Court (35-47'): ~5-15%</li>
                <li>• Full Court (47'+): ~1-5%</li>
              </ul>
              <p className="text-slate-400 text-xs mt-4 pt-3 border-t border-slate-600">Made by Haripraveer Puranam, 11/8/2025</p>
            </div>
          )}

          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="border-4 border-slate-600 rounded-lg cursor-crosshair w-full max-w-full h-auto"
                style={{ maxWidth: '658px' }}
              />
              <div className="flex flex-col gap-2 mt-3">
                <p className="text-slate-400 text-sm text-center">Click to place shot • Drag to move</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => handleBasketSwitch('left')}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                      targetBasket === 'left'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Shoot Left Basket
                  </button>
                  <button
                    onClick={() => handleBasketSwitch('right')}
                    className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
                      targetBasket === 'right'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Shoot Right Basket
                  </button>
                </div>
              </div>
            </div>

            <div className="xl:w-96 space-y-4">
              <div className="bg-slate-700 rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-bold text-white">Shot Statistics</h2>
                
                {probability ? (
                  <>
                    <div className="bg-slate-800 rounded-lg p-4">
                      <p className="text-slate-400 text-sm mb-1">Zone</p>
                      <p className="text-2xl font-bold text-white">{probability.zone}</p>
                    </div>
                    
                    <div className="bg-slate-800 rounded-lg p-4">
                      <p className="text-slate-400 text-sm mb-1">Distance from Basket</p>
                      <p className="text-2xl font-bold text-white">{probability.distance} ft</p>
                    </div>
                    
                    <div className="bg-slate-800 rounded-lg p-4">
                      <p className="text-slate-400 text-sm mb-1">Shot Probability</p>
                      <p className="text-4xl font-bold text-green-400">{probability.probability.toFixed(1)}%</p>
                      <div className="w-full bg-slate-600 rounded-full h-3 mt-3">
                        <div
                          className="bg-green-400 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${probability.probability}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-800 rounded-lg p-4">
                      <label className="text-slate-400 text-sm mb-2 block">Number of Shots</label>
                      <input
                        type="number"
                        value={shotCount}
                        onChange={(e) => setShotCount(Math.max(1, Math.min(1000, parseInt(e.target.value) || 10)))}
                        className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-blue-500"
                        min="1"
                        max="1000"
                      />
                    </div>

                    <button
                      onClick={simulateShots}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      <TrendingUp size={20} />
                      Simulate {shotCount} Shots
                    </button>

                    {results && (
                      <div className="bg-slate-800 rounded-lg p-4">
                        <p className="text-slate-400 text-sm mb-2">Results</p>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-green-400 font-bold text-xl">Made: {results.made}</span>
                          <span className="text-red-400 font-bold text-xl">Missed: {results.missed}</span>
                        </div>
                        <p className="text-white font-semibold">
                          Accuracy: {((results.made / shotCount) * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handleReset}
                      className="w-full flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      <RotateCcw size={20} />
                      Reset Shot
                    </button>
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <p className="text-lg mb-2">No shot selected</p>
                    <p className="text-sm">Click on the court to place a shot</p>
                  </div>
                )}
              </div>

              {showGraph && results && (
                <div className="bg-slate-700 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Shot Progression</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={results.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                      <XAxis 
                        dataKey="shot" 
                        stroke="#cbd5e1"
                        label={{ value: 'Shot Number', position: 'insideBottom', offset: -5, fill: '#cbd5e1' }}
                      />
                      <YAxis stroke="#cbd5e1" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#334155', border: 'none', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="made" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        name="Made Shots"
                        dot={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="missed" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="Missed Shots"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasketballCourtSimulator;