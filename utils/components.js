import React from 'react';
import { View, Text } from 'react-native';

// Helper function to format timestamp (with time)
export function formatTimestamp(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
  const timeStr = `${displayHours}:${displayMinutes} ${ampm}`;

  // Today
  if (diffDays === 0 && date.getDate() === now.getDate()) {
    return `Today ${timeStr}`;
  }

  // Yesterday
  if (diffDays === 1 || (diffDays === 0 && date.getDate() === now.getDate() - 1)) {
    return `Yesterday ${timeStr}`;
  }

  // Last 7 days - show day of week
  if (diffDays < 7) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[date.getDay()]} ${timeStr}`;
  }

  // This year - show month and day
  if (date.getFullYear() === now.getFullYear()) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()} ${timeStr}`;
  }

  // Over a year - show full date with year
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()} ${timeStr}`;
}

// Helper function to format date only (no time)
export function formatDateOnly(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Today
  if (diffDays === 0 && date.getDate() === now.getDate()) {
    return `Today`;
  }

  // Yesterday
  if (diffDays === 1 || (diffDays === 0 && date.getDate() === now.getDate() - 1)) {
    return `Yesterday`;
  }

  // All other dates - show MM/DD/YYYY at time format
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  // Format time
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const timeStr = `${hours}:${minutes} ${ampm}`;
  
  return `${month}/${day}/${year} at ${timeStr}`;
}

// Simple Markdown Text Component
export function MarkdownText({ children, style }) {
  const parseMarkdown = (text) => {
    if (!text) return [];

    const lines = text.split('\n');
    const elements = [];

    lines.forEach((line, index) => {
      // Parse line for inline formatting
      const parts = [];
      let currentText = '';
      let i = 0;

      while (i < line.length) {
        // Bold (**text**)
        if (line[i] === '*' && line[i + 1] === '*') {
          if (currentText) {
            parts.push({ text: currentText, bold: false });
            currentText = '';
          }
          i += 2;
          let boldText = '';
          while (i < line.length && !(line[i] === '*' && line[i + 1] === '*')) {
            boldText += line[i];
            i++;
          }
          parts.push({ text: boldText, bold: true });
          i += 2;
        }
        // Italic (*text*)
        else if (line[i] === '*' && line[i + 1] !== '*') {
          if (currentText) {
            parts.push({ text: currentText, bold: false });
            currentText = '';
          }
          i += 1;
          let italicText = '';
          while (i < line.length && line[i] !== '*') {
            italicText += line[i];
            i++;
          }
          parts.push({ text: italicText, italic: true });
          i += 1;
        } else {
          currentText += line[i];
          i++;
        }
      }

      if (currentText) {
        parts.push({ text: currentText, bold: false });
      }

      // Check if line is a heading
      const isHeading = line.match(/^(#{1,3})\s+(.+)$/);
      const isBullet = line.match(/^[-*]\s+(.+)$/);
      const isNumbered = line.match(/^\d+\.\s+(.+)$/);

      if (isHeading) {
        const level = isHeading[1].length;
        const headingStyles = {
          1: { fontSize: 24, fontWeight: '700', marginVertical: 8 },
          2: { fontSize: 20, fontWeight: '600', marginVertical: 6 },
          3: { fontSize: 18, fontWeight: '600', marginVertical: 4 },
        };
        elements.push(
          <Text key={index} style={[style, headingStyles[level]]}>
            {isHeading[2]}
          </Text>
        );
      } else if (isBullet) {
        elements.push(
          <View key={index} style={{ flexDirection: 'row', marginVertical: 2 }}>
            <Text style={[style, { marginRight: 8 }]}>• </Text>
            <Text style={style}>{isBullet[1]}</Text>
          </View>
        );
      } else if (isNumbered) {
        elements.push(
          <View key={index} style={{ flexDirection: 'row', marginVertical: 2 }}>
            <Text style={[style, { marginRight: 8 }]}>{isNumbered[0].match(/^\d+\./)[0]} </Text>
            <Text style={style}>{isNumbered[1]}</Text>
          </View>
        );
      } else if (parts.length > 0) {
        elements.push(
          <Text key={index} style={style}>
            {parts.map((part, partIndex) => (
              <Text
                key={partIndex}
                style={[
                  part.bold && { fontWeight: 'bold' },
                  part.italic && { fontStyle: 'italic' },
                ]}
              >
                {part.text}
              </Text>
            ))}
            {'\n'}
          </Text>
        );
      } else {
        elements.push(<Text key={index} style={style}>{'\n'}</Text>);
      }
    });

    return elements;
  };

  return <View>{parseMarkdown(children)}</View>;
}