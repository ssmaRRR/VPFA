import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

// Paleta de culori pentru activele de investiții
const PIE_COLORS = ['#c5e384', '#a8e6cf', '#ebd5c7', '#ffb347', '#8e8680', '#5cdb95'];

// Tooltip personalizat stilizat ca glassmorphism
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip" style={{
        background: 'rgba(15, 12, 38, 0.85)',
        border: '1px solid rgba(108, 93, 211, 0.3)',
        padding: '10px 15px',
        borderRadius: '8px',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        fontSize: '0.85rem'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '5px' }}>{label}</p>
        {payload.map((pld, index) => (
          <div key={index} style={{ color: pld.color, display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
            <span>{pld.name}:</span>
            <span style={{ fontWeight: '600' }}>{pld.value.toFixed(2)} RON</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Tooltip pentru alocare portofoliu
const PieCustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="custom-chart-tooltip" style={{
        background: 'rgba(15, 12, 38, 0.85)',
        border: '1px solid rgba(108, 93, 211, 0.3)',
        padding: '10px 15px',
        borderRadius: '8px',
        backdropFilter: 'blur(8px)',
        color: '#fff',
        fontSize: '0.85rem'
      }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: payload[0].color }}>{data.clasa_active}</p>
        <p style={{ margin: '3px 0 0 0' }}>Proporție: <strong>{data.procent}%</strong></p>
        <p style={{ margin: '3px 0 0 0' }}>Valoare lunară: <strong>{data.valoare_estimata.toFixed(2)} RON</strong></p>
      </div>
    );
  }
  return null;
};

export function TrendChart({ data }) {
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorVenituri" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#5cdb95" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#5cdb95" stopOpacity={0.0}/>
            </linearGradient>
            <linearGradient id="colorCheltuieli" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ebd5c7" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#ebd5c7" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
          <XAxis 
            dataKey="luna" 
            stroke="#8e8680" 
            fontSize={11} 
            tickLine={false}
          />
          <YAxis 
            stroke="#8e8680" 
            fontSize={11} 
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36} 
            iconType="circle"
            wrapperStyle={{ fontSize: '0.85rem' }}
          />
          <Area 
            type="monotone" 
            name="Venituri" 
            dataKey="venituri" 
            stroke="#5cdb95" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorVenituri)" 
          />
          <Area 
            type="monotone" 
            name="Cheltuieli" 
            dataKey="cheltuieli" 
            stroke="#ebd5c7" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorCheltuieli)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ForecastChart({ historicalData, forecastData }) {
  // Combinăm istoricul cu prognoza pentru un grafic continuu.
  // Istoricul se termină unde începe prognoza.
  const chartData = [
    ...historicalData.map(h => ({ data: h.data, sold_istoric: h.sold_estimat, sold_prognozat: null })),
    // Adăugăm ultimul punct istoric ca punct de plecare pentru linia de prognoză pentru continuitate
    { 
      data: historicalData[historicalData.length - 1]?.data || '', 
      sold_istoric: historicalData[historicalData.length - 1]?.sold_estimat || null, 
      sold_prognozat: historicalData[historicalData.length - 1]?.sold_estimat || null 
    },
    ...forecastData.map(f => ({ data: f.data, sold_istoric: null, sold_prognozat: f.sold_estimat }))
  ];

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorIstoric" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a8e6cf" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#a8e6cf" stopOpacity={0.0}/>
            </linearGradient>
            <linearGradient id="colorPrognoza" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffb347" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#ffb347" stopOpacity={0.0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
          <XAxis dataKey="data" stroke="#8e8680" fontSize={11} tickLine={false} />
          <YAxis stroke="#8e8680" fontSize={11} tickLine={false} axisLine={false} />
          
          <Tooltip content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const val = payload[0].value;
              const name = payload[0].name;
              return (
                <div style={{
                  background: 'rgba(15, 12, 38, 0.85)',
                  border: '1px solid rgba(197, 227, 132, 0.3)',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>{label}</p>
                  <p style={{ margin: '5px 0 0 0', color: payload[0].color }}>
                    {name}: <strong>{val.toFixed(2)} RON</strong>
                  </p>
                </div>
              );
            }
            return null;
          }} />

          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.85rem' }} />
          <Area 
            type="monotone" 
            name="Sold Istoric" 
            dataKey="sold_istoric" 
            stroke="#a8e6cf" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorIstoric)" 
            connectNulls
          />
          <Area 
            type="monotone" 
            name="Prognoză Sold (ML)" 
            dataKey="sold_prognozat" 
            stroke="#ffb347" 
            strokeWidth={3}
            strokeDasharray="5 5"
            fillOpacity={1} 
            fill="url(#colorPrognoza)" 
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PortfolioAllocationChart({ data }) {
  const [isMobile, setIsMobile] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 950px)');
    const handleResize = () => setIsMobile(mediaQuery.matches);
    handleResize();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleResize);
      return () => mediaQuery.removeEventListener('change', handleResize);
    } else {
      mediaQuery.addListener(handleResize);
      return () => mediaQuery.removeListener(handleResize);
    }
  }, []);

  const totalValue = data.reduce((sum, item) => sum + item.valoare_estimata, 0);

  return (
    <div style={{ position: 'relative', width: '100%', height: 350, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy={isMobile ? "50%" : "40%"}
            innerRadius={isMobile ? 55 : 50}
            outerRadius={isMobile ? 82 : 75}
            paddingAngle={5}
            dataKey="procent"
            onMouseEnter={(data, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(-1)}
            onClick={(data, index) => {
              if (activeIndex === index) {
                setActiveIndex(-1);
              } else {
                setActiveIndex(index);
              }
            }}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={PIE_COLORS[index % PIE_COLORS.length]} 
                opacity={activeIndex === -1 || activeIndex === index ? 1 : 0.6}
                stroke={activeIndex === index ? '#fff' : 'rgba(255,255,255,0.05)'}
                strokeWidth={activeIndex === index ? 2 : 1}
                style={{ cursor: 'pointer', outline: 'none', transition: 'all 0.2s ease' }}
              />
            ))}
          </Pie>
          <Tooltip content={<PieCustomTooltip />} />
          {!isMobile && (
            <Legend 
              verticalAlign="bottom" 
              iconType="circle"
              formatter={(value, entry, index) => {
                const item = data[index];
                return <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{item.clasa_active} ({item.procent}%)</span>;
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Text în centrul donut chart-ului */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '50%' : '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: isMobile ? '95px' : '100px',
        height: isMobile ? '95px' : '100px',
        borderRadius: '50%',
        zIndex: 5
      }}>
        <span style={{ 
          fontSize: isMobile ? '0.7rem' : '0.75rem', 
          color: activeIndex !== -1 ? PIE_COLORS[activeIndex % PIE_COLORS.length] : 'var(--text-secondary)',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'block',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {activeIndex !== -1 ? data[activeIndex].clasa_active : 'Active'}
        </span>
        <span style={{ 
          fontSize: isMobile ? '0.95rem' : '1.05rem', 
          color: 'var(--text-primary)',
          fontWeight: '800',
          marginTop: '2px',
          display: 'block',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {activeIndex !== -1 
            ? `${data[activeIndex].procent}%`
            : '100%'
          }
        </span>
        {totalValue > 0 && (
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            marginTop: '1px',
            display: 'block',
            width: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {activeIndex !== -1 
              ? `${data[activeIndex].valoare_estimata.toLocaleString('ro-RO')} RON`
              : `${totalValue.toLocaleString('ro-RO')} RON`
            }
          </span>
        )}
      </div>
    </div>
  );
}


export function ExpensePieChart({ data, height = 280 }) {
  const [isMobile, setIsMobile] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 950px)');
    const handleResize = () => setIsMobile(mediaQuery.matches);
    handleResize();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleResize);
      return () => mediaQuery.removeEventListener('change', handleResize);
    } else {
      mediaQuery.addListener(handleResize);
      return () => mediaQuery.removeListener(handleResize);
    }
  }, []);

  const totalSum = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ position: 'relative', width: '100%', height, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy={isMobile ? "50%" : "38%"}
            innerRadius={isMobile ? 50 : (height < 280 ? 40 : 55)}
            outerRadius={isMobile ? 75 : (height < 280 ? 60 : 82)}
            paddingAngle={4}
            dataKey="value"
            onMouseEnter={(data, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(-1)}
            onClick={(data, index) => {
              if (activeIndex === index) {
                setActiveIndex(-1);
              } else {
                setActiveIndex(index);
              }
            }}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={PIE_COLORS[index % PIE_COLORS.length]} 
                opacity={activeIndex === -1 || activeIndex === index ? 1 : 0.6}
                stroke={activeIndex === index ? '#fff' : 'rgba(255,255,255,0.05)'}
                strokeWidth={activeIndex === index ? 2 : 1}
                style={{ cursor: 'pointer', outline: 'none', transition: 'all 0.2s ease' }}
              />
            ))}
          </Pie>
          <Tooltip content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const item = payload[0].payload;
              return (
                <div className="custom-chart-tooltip" style={{
                  background: 'rgba(15, 12, 38, 0.9)',
                  border: '1px solid rgba(197, 227, 132, 0.3)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backdropFilter: 'blur(8px)',
                  color: '#fff',
                  fontSize: '0.85rem'
                }}>
                  <p style={{ margin: 0, fontWeight: 'bold', color: payload[0].color }}>{item.name}</p>
                  <p style={{ margin: '3px 0 0 0' }}>Sumă: <strong>{item.value.toLocaleString('ro-RO')} RON</strong></p>
                  <p style={{ margin: '3px 0 0 0' }}>Pondere: <strong>{totalSum > 0 ? ((item.value / totalSum) * 100).toFixed(1) : 0}%</strong></p>
                </div>
              );
            }
            return null;
          }} />
          {!isMobile && (
            <Legend 
              verticalAlign="bottom" 
              iconType="circle"
              formatter={(value, entry, index) => {
                const item = data[index];
                return <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{item.name} ({item.value.toLocaleString('ro-RO')} RON)</span>;
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Text în centrul donut chart-ului */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '50%' : '38%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        width: isMobile ? '90px' : '100px',
        height: isMobile ? '90px' : '100px',
        borderRadius: '50%',
        zIndex: 5
      }}>
        <span style={{ 
          fontSize: isMobile ? '0.7rem' : '0.75rem', 
          color: activeIndex !== -1 ? PIE_COLORS[activeIndex % PIE_COLORS.length] : 'var(--text-secondary)',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          display: 'block',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {activeIndex !== -1 ? data[activeIndex].name : 'Total'}
        </span>
        <span style={{ 
          fontSize: isMobile ? '0.9rem' : '0.95rem', 
          color: 'var(--text-primary)',
          fontWeight: '800',
          marginTop: '2px',
          display: 'block',
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {activeIndex !== -1 
            ? `${data[activeIndex].value.toLocaleString('ro-RO')} RON`
            : `${totalSum.toLocaleString('ro-RO')} RON`
          }
        </span>
        {totalSum > 0 && (
          <span style={{
            fontSize: '0.7rem',
            color: 'var(--text-muted)',
            marginTop: '1px',
            display: 'block'
          }}>
            {activeIndex !== -1 
              ? `${((data[activeIndex].value / totalSum) * 100).toFixed(1)}%`
              : '100%'
            }
          </span>
        )}
      </div>
    </div>
  );
}

