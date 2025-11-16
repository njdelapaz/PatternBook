// Mock SVG component
import React from 'react';

export default function MockSVG(props) {
  return React.createElement('svg', props, props.children);
}