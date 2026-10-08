function SkeletonBlock({ width = '100%', height = '20px', className = '' }) {
  return (
    <div
      className={`jega-skeleton ${className}`}
      style={{ width, height }}
    />
  );
}

export default SkeletonBlock;