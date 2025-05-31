import React, { useState, useEffect, useRef } from 'react';

// Function to generate a smooth spectrum of colors
// This creates a full RGB color wheel cycle for smooth transitions
const generateSmoothSpectrum = (numSteps = 120) => {
  const colors = [];
  // Aim for 6 segments (Red-Yellow-Green-Cyan-Blue-Magenta-Red)
  // Ensure at least 1 step per segment to avoid division by zero if numSteps is too small
  const stepsPerSegment = Math.max(1, Math.floor(numSteps / 6));

  // Red to Yellow (R=255, G=0->255, B=0)
  for (let i = 0; i < stepsPerSegment; i++) {
    colors.push([255, Math.floor(i * (255 / stepsPerSegment)), 0]);
  }
  // Yellow to Green (R=255->0, G=255, B=0)
  for (let i = 0; i < stepsPerSegment; i++) {
    colors.push([255 - Math.floor(i * (255 / stepsPerSegment)), 255, 0]);
  }
  // Green to Cyan (R=0, G=255, B=0->255)
  for (let i = 0; i < stepsPerSegment; i++) {
    colors.push([0, 255, Math.floor(i * (255 / stepsPerSegment))]);
  }
  // Cyan to Blue (R=0, G=255->0, B=255)
  for (let i = 0; i < stepsPerSegment; i++) {
    colors.push([0, 255 - Math.floor(i * (255 / stepsPerSegment)), 255]);
  }
  // Blue to Magenta (R=0->255, G=0, B=255)
  for (let i = 0; i < stepsPerSegment; i++) {
    colors.push([Math.floor(i * (255 / stepsPerSegment)), 0, 255]);
  }
  // Magenta to Red (R=255, G=0, B=255->0)
  for (let i = 0; i < stepsPerSegment; i++) {
    colors.push([255, 0, 255 - Math.floor(i * (255 / stepsPerSegment))]);
  }

  // Ensure the array has exactly numSteps elements,
  // handling slight deviations due to floor operations.
  return colors.slice(0, numSteps);
};

// Generate a smooth spectrum with a good number of steps (e.g., 120)
const SMOOTH_VIBGYOR_COLORS = generateSmoothSpectrum(120);

// Define animation parameters (these remain constants)
const ANIMATION_INTERVAL = 100; // Time in milliseconds between each animation frame
const DROP_LIFE_SPAN = 7; // How many animation frames a colored block stays visible before fading out
// NUM_SIMULTANEOUS_DROPS is now calculated dynamically

// Define min and max limits for grid dimensions
const MIN_DIMENSION = 1;
const MAX_DIMENSION = 25;

function App() {
  // State for grid dimensions, allowing user to change them
  const [gridRows, setGridRows] = useState(15);
  const [gridCols, setGridCols] = useState(20);

  // gridState stores the state of each cell.
  // Each cell can be null (transparent) or an object { r, g, b, life }
  // 'life' indicates how many animation frames the cell has left before it disappears.
  const [gridState, setGridState] = useState(() =>
    Array(gridRows)
      .fill(null)
      .map(() => Array(gridCols).fill(null))
  );

  // useRef for activeDrops: holds the "head" of each falling drop.
  // Using useRef allows direct mutation within the interval without re-triggering the effect.
  const activeDropsRef = useRef([]);

  // useRef for currentSpawningColorIndex: The index of the VIBGYOR color
  // that is currently being spawned (i.e., whose drops are being added to activeDropsRef).
  // Start with the first color in the new smooth spectrum (which should be red)
  const currentSpawningColorIndexRef = useRef(0);

  // useRef for nextColorSpawnQueue: Holds column indices for drops of the *next* color
  // that are waiting to be spawned. This queue is populated when the current color reaches halfway.
  const nextColorSpawnQueueRef = useRef([]);

  // Helper function to shuffle an array (Fisher-Payes algorithm)
  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
    return array;
  };

  // Function to generate a new set of random columns for spawning
  // This now uses the current gridCols state to determine the number of drops
  const generateNewSpawnColumns = () => {
    const minSpawnCol = 0;
    const maxSpawnCol = Math.max(0, gridCols - 1); // Dynamically use current gridCols, ensure not negative
    
    // Calculate NUM_SIMULTANEOUS_DROPS dynamically based on gridCols
    // Ensure at least 1 drop, even if gridCols is very small or zero
    const dynamicNumDrops = Math.max(1, Math.floor(gridCols * 1 / 4)); 

    // If gridCols is 0, availableCols will be empty, which is handled gracefully by slice
    const availableCols = Array.from({ length: maxSpawnCol - minSpawnCol + 1 }, (_, i) => minSpawnCol + i);
    const shuffledCols = shuffleArray(availableCols);
    return shuffledCols.slice(0, Math.min(dynamicNumDrops, availableCols.length));
  };

  // useEffect hook for the main animation loop.
  // This effect re-runs whenever gridRows or gridCols change, effectively resetting the animation.
  useEffect(() => {
    let intervalId; // Variable to hold the interval ID for cleanup

    // Re-initialize all animation-related refs and state when dimensions change
    activeDropsRef.current = [];
    currentSpawningColorIndexRef.current = 0; // Always start from the first color in the new spectrum
    nextColorSpawnQueueRef.current = generateNewSpawnColumns(); // Re-populate initial queue with new dims

    // Re-initialize gridState based on new dimensions
    setGridState(Array(gridRows).fill(null).map(() => Array(gridCols).fill(null)));

    // Function to start the animation loop
    const startAnimation = () => {
      intervalId = setInterval(() => {
        // Use functional update for setGridState to get the previous grid state
        setGridState(prevGridState => {
          // Create a deep copy of the previous grid state to safely modify it.
          // Ensure the copy respects the *current* grid dimensions.
          const newGridState = Array(gridRows).fill(null).map(() => Array(gridCols).fill(null));
          for (let r = 0; r < Math.min(prevGridState.length, gridRows); r++) {
            for (let c = 0; c < Math.min(prevGridState[r].length, gridCols); c++) {
              newGridState[r][c] = { ...prevGridState[r][c] };
            }
          }

          // 1. Decay existing colored cells on the grid
          for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
              if (newGridState[r][c] && newGridState[r][c].life > 0) {
                newGridState[r][c].life--; // Decrement life
              } else if (newGridState[r][c] && newGridState[r][c].life <= 0) {
                newGridState[r][c] = null; // Make cell transparent if life runs out
              }
            }
          }

          // --- Manage active drops (falling heads and their trails) ---
          const currentActiveDrops = activeDropsRef.current;
          const updatedDrops = [];
          let anyCurrentSpawningColorDropPastHalfway = false; // Flag for transition trigger

          // Calculate the halfway point of the grid using current gridRows
          const halfwayPoint = Math.floor(gridRows / 2);

          currentActiveDrops.forEach(drop => {
            const newRow = drop.row + 1; // Move the drop head down by one row

            // Check if this drop belongs to the color currently being spawned AND has reached halfway
            if (drop.color === SMOOTH_VIBGYOR_COLORS[currentSpawningColorIndexRef.current] && drop.row >= halfwayPoint) {
              anyCurrentSpawningColorDropPastHalfway = true;
            }

            // Mark the entire trail of the drop
            // Iterate upwards from the current drop's row for the length of DROP_LIFE_SPAN
            for (let r = drop.row; r >= Math.max(0, drop.row - DROP_LIFE_SPAN + 1); r--) {
              // Ensure the row and column are within current grid boundaries
              if (r >= 0 && r < gridRows && drop.col >= 0 && drop.col < gridCols) {
                // Calculate life remaining for this part of the trail
                const lifeRemaining = DROP_LIFE_SPAN - (drop.row - r);
                newGridState[r][drop.col] = {
                  r: drop.color[0],
                  g: drop.color[1],
                  b: drop.color[2],
                  life: lifeRemaining, // Assign calculated life
                };
              }
            }

            // Keep the drop head in the activeDrops array as long as its trail
            // could potentially still be visible on the grid and within new bounds.
            if (newRow < gridRows + DROP_LIFE_SPAN && drop.col < gridCols) {
              updatedDrops.push({ ...drop, row: newRow });
            }
          });

          // Update the active drops ref
          activeDropsRef.current = updatedDrops;

          // --- Logic for triggering next color and spawning new drops ---

          // Condition to trigger next color's spawn queue population:
          // If a drop of the *currently spawning* color has reached halfway
          // AND the queue for the *next* color is currently empty (meaning it hasn't been prepared yet)
          if (anyCurrentSpawningColorDropPastHalfway && nextColorSpawnQueueRef.current.length === 0) {
            // Advance to the next VIBGYOR color to be spawned
            currentSpawningColorIndexRef.current = (currentSpawningColorIndexRef.current + 1) % SMOOTH_VIBGYOR_COLORS.length;

            // Populate the queue for the *newly advanced* color
            nextColorSpawnQueueRef.current = generateNewSpawnColumns();
          }

          // Spawn one drop from the 'nextColorSpawnQueue' per animation frame, if the queue is not empty
          if (nextColorSpawnQueueRef.current.length > 0) {
            const colToSpawn = nextColorSpawnQueueRef.current.shift(); // Take the first column and remove it from the queue

            // Add the new drop to activeDropsRef, using the color that is currently being spawned
            // Ensure the spawned column is within current grid bounds
            if (colToSpawn < gridCols) {
              activeDropsRef.current.push({
                col: colToSpawn,
                row: 0, // New drops start at the very top row
                color: SMOOTH_VIBGYOR_COLORS[currentSpawningColorIndexRef.current],
              });
            }
          }

          return newGridState; // Return the new grid state for rendering
        });
      }, ANIMATION_INTERVAL); // Set the interval time for the animation loop
    };

    startAnimation(); // Start the animation loop when the component mounts

    // Cleanup function: clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [gridRows, gridCols]); // Effect re-runs when gridRows or gridCols change

  return (
    // Main container for the application, styled with Tailwind CSS
    // Use flex to create two columns for the layout
    <div className="min-h-screen bg-black flex flex-col md:flex-row items-center justify-center p-4 font-inter">

      {/* Left Half: VIBGYOR Rain Animation */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 w-full md:w-1/2">
        {/* Dimension Change Options */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-6 text-white text-sm">
          <label className="flex items-center">
            Rows:
            <input
              type="number"
              min={MIN_DIMENSION}
              max={MAX_DIMENSION}
              value={gridRows}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                // Clamp the value between MIN_DIMENSION and MAX_DIMENSION
                setGridRows(Math.min(Math.max(value || MIN_DIMENSION, MIN_DIMENSION), MAX_DIMENSION));
              }}
              className="ml-2 p-1 rounded bg-gray-700 text-white w-20 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <label className="flex items-center">
            Cols:
            <input
              type="number"
              min={MIN_DIMENSION}
              max={MAX_DIMENSION}
              value={gridCols}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                // Clamp the value between MIN_DIMENSION and MAX_DIMENSION
                setGridCols(Math.min(Math.max(value || MIN_DIMENSION, MIN_DIMENSION), MAX_DIMENSION));
              }}
              className="ml-2 p-1 rounded bg-gray-700 text-white w-20 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
        </div>

        <div
          className="grid gap-px bg-black rounded-md overflow-hidden border border-gray-800" // Darker border for grid
          style={{
            // Dynamically set grid columns based on gridCols state
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            // Dynamically set grid rows based on gridRows state
            gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
            // Set explicit width and height for the grid based on cell size (20px per cell)
            width: `${gridCols * 20}px`,
            height: `${gridRows * 20}px`,
          }}
        >
          {/* Map through the gridState to render each cell */}
          {gridState.map((row, rowIndex) =>
            row.map((cellColor, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`} // Unique key for each cell
                className="w-5 h-5 rounded-sm border border-gray-800" // Darker border for cells
                style={{
                  // Set background color using RGBA for fading effect.
                  // Opacity is calculated based on remaining 'life' divided by total 'DROP_LIFE_SPAN'.
                  backgroundColor: cellColor
                    ? `rgba(${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${cellColor.life / DROP_LIFE_SPAN})`
                    : 'transparent' // If cellColor is null, it's transparent
                }}
              ></div>
            ))
          )}
        </div>
      </div>

      {/* Right Half: Game Details and Options */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 w-full md:w-1/2 text-white bg-zinc-950 rounded-xl shadow-2xl m-4"> {/* Deeper background, larger rounded corners, stronger shadow */}
        <h2 className="text-5xl font-bold mb-6 text-center text-blue-400 tracking-wide">VIBGYOR Rain</h2> {/* Changed title here! */}
        <p className="text-lg text-gray-400 mb-8 text-center max-w-md leading-relaxed"> {/* Slightly lighter gray, relaxed line-height */}
          Immerse yourself in a mesmerizing cascade of colors! Watch as vibrant drops fall and fade,
          creating a dynamic and ever-changing visual spectacle. Prepare for a unique challenge!
        </p>
        <div className="flex flex-col space-y-4 w-full max-w-xs">
          <button className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-8 rounded-md shadow-lg transition duration-300 ease-in-out"> {/* Darker background, less rounded, stronger shadow, no scale transform */}
            Start Game
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-8 rounded-md shadow-lg transition duration-300 ease-in-out">
            How to Play
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-8 rounded-md shadow-lg transition duration-300 ease-in-out">
            Settings
          </button>
          <button className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-4 px-8 rounded-md shadow-lg transition duration-300 ease-in-out">
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;