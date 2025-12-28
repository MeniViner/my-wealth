/**
 * Custom content component for Recharts Treemap
 */
const CustomTreemapContent = (props) => {
  const { x, y, width, height, name, size } = props;
  
  if (width < 40 || height < 30) return null;
  
  const fontSize = Math.min(Math.max(width / 12, 10), 16);
  const showValue = width > 80 && height > 50;
  const textY = y + height / 2 - (showValue ? 10 : 0);
  const valueY = y + height / 2 + 12;
  const textWidth = Math.min(width * 0.9, 200);
  const textHeight = showValue ? fontSize * 2.8 : fontSize * 1.8;
  
  return (
    <g>
      <rect 
        x={x} 
        y={y} 
        width={width} 
        height={height} 
        style={{ fill: props.fill, stroke: '#fff', strokeWidth: 2 }} 
      />
      {/* Background for text to improve readability */}
      {width > 50 && (
        <rect 
          x={x + width / 2 - textWidth / 2} 
          y={textY - fontSize - 4} 
          width={textWidth} 
          height={textHeight} 
          fill="rgba(0, 0, 0, 0.65)" 
          rx={6}
        />
      )}
      <text 
        x={x + width / 2} 
        y={textY} 
        textAnchor="middle" 
        fill="#fff" 
        fontSize={fontSize} 
        fontWeight="bold"
        style={{ 
          textShadow: '2px 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)',
          pointerEvents: 'none'
        }}
      >
        {name}
      </text>
      {showValue && size && (
        <text 
          x={x + width / 2} 
          y={valueY} 
          textAnchor="middle" 
          fill="#fff" 
          fontSize={fontSize - 1}
          fontWeight="700"
          style={{ 
            textShadow: '2px 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)',
            pointerEvents: 'none'
          }}
        >
          ₪{size.toLocaleString()}
        </text>
      )}
    </g>
  );
};

export default CustomTreemapContent;

