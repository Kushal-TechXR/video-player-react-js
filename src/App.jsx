import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import Carousel from './components/carousel';
import CategoryTabs from './components/categoriesTab';

// Style constants to avoid recreating on every render
const FULL_SCREEN_STYLES = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#0d0716',
};

const LOADING_STYLES = {
  ...FULL_SCREEN_STYLES,
  color: '#fff',
  fontSize: '24px',
  zIndex: 1,
};

const ERROR_STYLES = {
  ...FULL_SCREEN_STYLES,
  color: '#ff4444',
  fontSize: '18px',
  padding: '20px',
  textAlign: 'center',
  zIndex: 1,
};

const NO_REELS_STYLES = {
  ...FULL_SCREEN_STYLES,
  color: '#fff',
  fontSize: '18px',
  zIndex: 1,
};

const CONTAINER_STYLES = {
  width: '100vw',
  height: '100vh',
  overflow: 'hidden',
  margin: 0,
  padding: 0,
  top: 0,
  left: 0,
  position: 'fixed',
  zIndex: 1,
};
const authToken = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjUwODk4MzcsInVzZXJfbmFtZSI6IjI2NyIsImF1dGhvcml0aWVzIjpbIlJPTEVfRERBUFBfVVNFUiIsIlJPTEVfRERfUFVKQV9DQVNISUVSIiwiUk9MRV9ERF9QVUpBX01BTkFHRVIiLCJST0xFX0RJVklORV9GUkFOQ0hJU0VFX0NBU0hJRVIiLCJST0xFX1JPT1QiLCJST0xFX0REX1BVSkFfQURNSU4iLCJST0xFX0REQVBQX0FETUlOIiwiUk9MRV9ESVZJTkVfRlJBTkNISVNFRV9PUEVSQVRPUiIsIlJPTEVfRElWSU5FX0FETUlOIiwiUk9MRV9EREFQUF9TVVBQT1JUIiwiUk9MRV9ESVZJTkVfRlJBTkNISVNFRV9BQ0NPVU5UQU5UIiwiUk9MRV9ESVZJTkVfRlJBTkNISVNFRV9NQU5BR0VSIiwiUk9MRV9ESVZJTkVfRlJBTkNISVNFRSIsIlJPTEVfRERBUFBfQ09OVEVOVF9NQU5BR0VSIiwiUk9MRV9BRE1JTiIsIlJPTEVfRERfUFVKQV9NT0RFUkFUT1IiXSwianRpIjoid0p0bVRhcXY4XzgtclZJdGxmSFRFN0ZBaENJIiwiY2xpZW50X2lkIjoidGVjaHhyIiwic2NvcGUiOlsiYWxsIl19.FgSj0W-kVNfDw8we6LE3Z8i-8wG9EUBQcg1kjXyvY1QIzbfkx3QJJ3_lRMH_bpD2gQ6zEBzWhc1N0S73DGLxLJLXLPq2wiXEJPLkAYNaQkHtxjZSc8JoYlweYO0zYqjeYkAjYt--PtI744eiSQBr-_iQXtIZMG-ZYJJQXJz4sl2okovQYFRzJWAueVVXPByJxguV6SQ1Saz72E56_Rb7TAx81QSA1A36yrOAmT3gwsGgfBo-FFOfZfwVffR_4oKlJXpJZD5mnE_J9buzk7qvMcKnA3YhbaIuB_vDZH3sERHGhAqAHlDH3wEuTB2-3cYaZF_r7G7TjzRmrlDPZzeyxg`;

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('Stories');
  const [windowHeight, setWindowHeight] = useState(() => typeof window !== 'undefined' ? window.innerHeight : 300);

  // Handle window resize for baseWidth calculation
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(
          `https://devgateway.techxrdev.in/api/content/content/reels/feed?category=${category}&page=1&limit=50&userId=12`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err.message);
        setData(null);
        console.error('Error fetching reels:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category]);

  // Extract videoUrl array from API response - memoized to avoid recalculation
  const videoUrls = useMemo(() => {
    return data?.reels?.map(reel => reel.videoUrl) || [];
  }, [data]);

  // Handle category change - memoized with useCallback
  const handleCategoryChange = useCallback((newCategory) => {
    setCategory(newCategory);
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div style={LOADING_STYLES}>
        Loading reels...
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={ERROR_STYLES}>
        Error loading reels: {error}
      </div>
    );
  }

  // Show message if no reels found
  if (!videoUrls.length) {
    return (
      <div style={NO_REELS_STYLES}>
        No reels found for {category}
      </div>
    );
  }

  return (
    <div style={CONTAINER_STYLES}>
      <CategoryTabs 
        category={category} 
        onChange={handleCategoryChange}
      />
      <Carousel 
        key={category}
        baseWidth={windowHeight}
        items={videoUrls}
      />
    </div>
  );
}

export default App;
