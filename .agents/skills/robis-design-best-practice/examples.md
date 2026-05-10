# Design Best Practice Examples

This file contains practical code examples for implementing Robi's design principles.

## Table of Contents
1. [Color Examples](#color-examples)
2. [Spacing Examples](#spacing-examples)
3. [Border Radius Stacking](#border-radius-stacking)
4. [Icon Consistency](#icon-consistency)
5. [Shadow Alternatives](#shadow-alternatives)
6. [Animation Examples](#animation-examples)
7. [Micro-Interactions](#micro-interactions)
8. [Layout Alternatives](#layout-alternatives)

---

## Color Examples

### Low Saturation Color Palette (Tailwind Config)

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Low saturation primary colors
        primary: {
          50: 'hsl(220, 25%, 98%)',
          100: 'hsl(220, 25%, 95%)',
          200: 'hsl(220, 25%, 85%)',
          300: 'hsl(220, 25%, 75%)',
          400: 'hsl(220, 25%, 65%)',
          500: 'hsl(220, 25%, 50%)',  // Base color
          600: 'hsl(220, 30%, 40%)',
          700: 'hsl(220, 30%, 30%)',
          800: 'hsl(220, 30%, 20%)',
          900: 'hsl(220, 30%, 12%)',
        },
        // Muted accent color
        accent: {
          light: 'hsl(280, 30%, 60%)',
          DEFAULT: 'hsl(280, 35%, 50%)',
          dark: 'hsl(280, 40%, 40%)',
        },
      },
    },
  },
}
```

### Dark Mode Color Adjustments

```jsx
// Component with proper dark mode colors
export function Card({ children }) {
  return (
    <div className="
      bg-white dark:bg-[hsl(220,10%,12%)]
      text-gray-900 dark:text-gray-100
      border border-gray-200 dark:border-gray-800
      rounded-lg p-4
    ">
      {children}
    </div>
  );
}
```

### CSS Custom Properties for Light/Dark

```css
:root {
  /* Light mode - slightly tinted white */
  --bg-primary: hsl(0, 0%, 98%);
  --text-primary: hsl(220, 5%, 15%);
  --border-color: hsl(220, 10%, 90%);
  
  /* Muted colors */
  --accent: hsl(220, 30%, 50%);
}

[data-theme="dark"] {
  /* Dark mode - tinted black, desaturated colors */
  --bg-primary: hsl(220, 5%, 8%);
  --text-primary: hsl(220, 5%, 95%);
  --border-color: hsl(220, 10%, 18%);
  
  /* Desaturated and lightened */
  --accent: hsl(220, 20%, 65%);
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}
```

### WCAG AAA Contrast Examples

```jsx
// Text color utilities with AAA contrast
const textColors = {
  // On white/light backgrounds
  onLight: {
    heading: 'text-gray-900',      // #111111 - AAA
    body: 'text-gray-800',         // #1f1f1f - AAA
    muted: 'text-gray-600',        // #4b5563 - AA (use larger text)
  },
  
  // On dark backgrounds
  onDark: {
    heading: 'text-gray-50',       // #fafafa - AAA
    body: 'text-gray-100',         // #f3f4f6 - AAA
    muted: 'text-gray-400',        // #9ca3af - AA (use larger text)
  },
};

// Example usage
<div className="bg-white dark:bg-gray-900">
  <h1 className="text-gray-900 dark:text-gray-50">
    Heading with AAA contrast
  </h1>
  <p className="text-gray-800 dark:text-gray-100">
    Body text with AAA contrast
  </p>
</div>
```

---

## Spacing Examples

### Consistent Spacing Scale

```jsx
// Common spacing patterns (all multiples of 4)
export function SpacingExamples() {
  return (
    <>
      {/* Tight spacing - 4px/8px */}
      <div className="flex gap-2">
        <button className="px-3 py-1">Small</button>
        <button className="px-3 py-1">Buttons</button>
      </div>

      {/* Medium spacing - 12px/16px */}
      <div className="flex flex-col gap-4 mt-6">
        <input className="px-4 py-3" />
        <input className="px-4 py-3" />
      </div>

      {/* Large spacing - 24px/32px */}
      <section className="mt-8 space-y-6">
        <div>Section 1</div>
        <div>Section 2</div>
      </section>

      {/* Component padding */}
      <div className="p-4">      {/* 16px all sides */}
        <div className="p-6">    {/* 24px all sides */}
          Nested content
        </div>
      </div>
    </>
  );
}
```

### Grid Layouts with Consistent Gaps

```jsx
// Dashboard grid with 4px-based gaps
<div className="grid grid-cols-3 gap-6">  {/* 24px gap */}
  <Card className="p-6">Card 1</Card>
  <Card className="p-6">Card 2</Card>
  <Card className="p-6">Card 3</Card>
</div>

// Tighter grid
<div className="grid grid-cols-4 gap-4">  {/* 16px gap */}
  <Item />
  <Item />
  <Item />
  <Item />
</div>
```

---

## Border Radius Stacking

### Concentric Border Radius

```jsx
// Parent with 16px radius, 12px padding
// Child needs 4px radius (16 - 12 = 4)
export function ConcentricCard() {
  return (
    <div className="rounded-2xl p-3 bg-gray-100">  {/* 16px radius, 12px padding */}
      <div className="rounded bg-white p-4">       {/* 4px radius */}
        <p>Content with perfect concentric appearance</p>
      </div>
    </div>
  );
}
```

### Multiple Nesting Levels

```jsx
export function NestedCards() {
  return (
    <div className="rounded-3xl p-4 bg-gray-50">     {/* 24px radius, 16px padding */}
      <div className="rounded-2xl p-3 bg-gray-100">  {/* 16px radius (24-8), 12px padding */}
        <div className="rounded-lg p-4 bg-white">    {/* 8px radius (16-8) */}
          <div className="rounded p-2">              {/* 4px radius (8-4) */}
            Deep nesting with perfect curves
          </div>
        </div>
      </div>
    </div>
  );
}
```

### CSS Variables for Dynamic Radius

```css
.outer-card {
  --radius: 16px;
  --padding: 12px;
  border-radius: var(--radius);
  padding: var(--padding);
}

.inner-card {
  border-radius: calc(var(--radius) - var(--padding));  /* 4px */
}
```

---

## Icon Consistency

### Using Phosphor Icons (React)

```jsx
import { House, Gear, User, Bell } from '@phosphor-icons/react';

// Bad - mixing weights
function BadNav() {
  return (
    <nav>
      <House weight="fill" size={24} />      {/* filled */}
      <Gear weight="regular" size={24} />    {/* regular */}
      <User weight="thin" size={20} />       {/* thin + different size */}
      <Bell weight="duotone" size={24} />    {/* duotone */}
    </nav>
  );
}

// Good - consistent weight and size
function GoodNav({ activeTab }) {
  const iconProps = { size: 24, weight: 'regular' };
  
  return (
    <nav className="flex gap-6">
      <House {...iconProps} weight={activeTab === 'home' ? 'fill' : 'regular'} />
      <Gear {...iconProps} weight={activeTab === 'settings' ? 'fill' : 'regular'} />
      <User {...iconProps} weight={activeTab === 'profile' ? 'fill' : 'regular'} />
      <Bell {...iconProps} weight={activeTab === 'notifications' ? 'fill' : 'regular'} />
    </nav>
  );
}
```

### Icon System with Active States

```jsx
// Reusable icon component
export function NavIcon({ icon: Icon, isActive, label }) {
  return (
    <button className="flex flex-col items-center gap-1">
      <Icon 
        size={24} 
        weight={isActive ? 'fill' : 'regular'}
        className={isActive ? 'text-blue-600' : 'text-gray-600'}
      />
      <span className="text-xs">{label}</span>
    </button>
  );
}

// Usage
<nav className="flex gap-4">
  <NavIcon icon={House} isActive={tab === 'home'} label="Home" />
  <NavIcon icon={Gear} isActive={tab === 'settings'} label="Settings" />
</nav>
```

---

## Shadow Alternatives

### Dark Mode Border Instead of Shadow

```jsx
// Light mode uses shadow, dark mode uses border
export function ElevatedCard({ children }) {
  return (
    <div className="
      bg-white dark:bg-gray-900
      shadow-lg dark:shadow-none
      dark:border dark:border-gray-800
      rounded-lg p-6
    ">
      {children}
    </div>
  );
}
```

### Using Background Color for Elevation

```jsx
// Create depth with background color variations
export function LayeredLayout() {
  return (
    <div className="bg-gray-50 dark:bg-gray-950">  {/* Base layer */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6">  {/* Elevated */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-4">  {/* Inset */}
          Content at different elevation levels
        </div>
      </div>
    </div>
  );
}
```

### Subtle Glow for Focus (Dark Mode Friendly)

```css
/* Instead of drop shadow, use subtle glow */
.card-focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Dark mode - use border with transparency */
.dark .card-focus {
  box-shadow: none;
  border: 1px solid rgba(59, 130, 246, 0.3);
}
```

---

## Animation Examples

### Smooth Easing Functions

```css
/* Common easing curves */
.ease-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.ease-bounce {
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.ease-out-expo {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
```

### Framer Motion Examples

```jsx
import { motion } from 'framer-motion';

// Smooth page transitions
export function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1]  // Smooth custom easing
      }}
    >
      {children}
    </motion.div>
  );
}

// Spring physics for natural motion
export function SpringButton() {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg"
    >
      Click me
    </motion.button>
  );
}

// Stagger children animations
export function StaggerList({ items }) {
  return (
    <motion.ul
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: 0.1
          }
        }
      }}
    >
      {items.map((item, i) => (
        <motion.li
          key={i}
          variants={{
            hidden: { opacity: 0, x: -20 },
            visible: { opacity: 1, x: 0 }
          }}
        >
          {item}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

---

## Micro-Interactions

### Button States

```jsx
export function PremiumButton({ children, ...props }) {
  return (
    <button 
      className="
        px-6 py-3 rounded-lg
        bg-blue-600 hover:bg-blue-700 active:bg-blue-800
        text-white font-medium
        transform transition-all duration-200 ease-out
        hover:scale-[1.02] active:scale-[0.98]
        hover:shadow-lg
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      "
      {...props}
    >
      {children}
    </button>
  );
}
```

### Input Focus States

```jsx
export function StyledInput({ ...props }) {
  return (
    <input
      className="
        px-4 py-3 rounded-lg
        bg-white dark:bg-gray-900
        border-2 border-gray-200 dark:border-gray-700
        focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
        transition-all duration-200
        placeholder:text-gray-400
      "
      {...props}
    />
  );
}
```

### Checkbox Animation

```jsx
import { motion } from 'framer-motion';
import { Check } from '@phosphor-icons/react';

export function AnimatedCheckbox({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-5 h-5 rounded border-2 border-gray-300 bg-white"
    >
      <motion.div
        initial={false}
        animate={{
          scale: checked ? 1 : 0,
          opacity: checked ? 1 : 0
        }}
        transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
        className="absolute inset-0 bg-blue-600 rounded flex items-center justify-center"
      >
        <Check size={16} weight="bold" className="text-white" />
      </motion.div>
    </button>
  );
}
```

### Toast Notification

```jsx
import { motion, AnimatePresence } from 'framer-motion';

export function Toast({ message, isVisible }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.3 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30
          }}
          className="fixed bottom-4 right-4 px-6 py-3 bg-gray-900 text-white rounded-lg shadow-lg"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Loading Skeleton

```jsx
export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded ${className}`}>
      <div className="h-full w-full" />
    </div>
  );
}

// Usage
<div className="space-y-4">
  <Skeleton className="h-12 w-full" />
  <Skeleton className="h-24 w-3/4" />
  <Skeleton className="h-8 w-1/2" />
</div>
```

---

## Layout Alternatives

### Kanban Board

```jsx
export function KanbanBoard({ columns }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(column => (
        <div key={column.id} className="flex-shrink-0 w-80">
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="font-semibold mb-4">{column.title}</h3>
            <div className="space-y-3">
              {column.items.map(item => (
                <div 
                  key={item.id}
                  className="bg-white dark:bg-gray-800 p-3 rounded shadow-sm"
                >
                  {item.content}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Bento Grid

```jsx
export function BentoGrid() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Large featured item */}
      <div className="col-span-2 row-span-2 bg-blue-100 dark:bg-blue-900 rounded-xl p-6">
        Featured
      </div>
      
      {/* Medium items */}
      <div className="col-span-2 bg-gray-100 dark:bg-gray-800 rounded-xl p-6">
        Medium 1
      </div>
      <div className="col-span-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-6">
        Small 1
      </div>
      <div className="col-span-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-6">
        Small 2
      </div>
      
      {/* Wide item */}
      <div className="col-span-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-6">
        Wide
      </div>
    </div>
  );
}
```

### Timeline View

```jsx
export function Timeline({ events }) {
  return (
    <div className="space-y-8">
      {events.map((event, index) => (
        <div key={index} className="flex gap-4">
          {/* Timeline dot and line */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-600" />
            {index < events.length - 1 && (
              <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2" />
            )}
          </div>
          
          {/* Event content */}
          <div className="flex-1 pb-8">
            <time className="text-sm text-gray-500">{event.date}</time>
            <h4 className="font-semibold mt-1">{event.title}</h4>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {event.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Masonry Grid

```jsx
// Using CSS columns for masonry
export function MasonryGallery({ items }) {
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
      {items.map((item, i) => (
        <div 
          key={i}
          className="break-inside-avoid bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow"
        >
          <img src={item.image} alt={item.title} className="w-full" />
          <div className="p-4">
            <h3 className="font-semibold">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### List Group with Dividers

```jsx
export function ListGroup({ items }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
      {items.map((item, index) => (
        <div 
          key={index}
          className={`
            px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800
            transition-colors duration-150
            ${index !== items.length - 1 ? 'border-b border-gray-200 dark:border-gray-800' : ''}
          `}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{item.label}</span>
            <span className="text-gray-500 text-sm">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Complete Component Example

Putting it all together - a card component with all best practices:

```jsx
import { motion } from 'framer-motion';
import { Heart } from '@phosphor-icons/react';

export function PremiumCard({ title, description, image, onLike, isLiked }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
      className="
        bg-white dark:bg-[hsl(220,10%,12%)]
        border border-gray-200 dark:border-gray-800
        rounded-2xl p-4
        shadow-sm dark:shadow-none
        transition-all duration-200
      "
    >
      {/* Image container with proper radius stacking */}
      <div className="rounded-xl overflow-hidden mb-4">  {/* 16px - 4px = 12px */}
        <img src={image} alt={title} className="w-full h-48 object-cover" />
      </div>
      
      {/* Content with consistent spacing */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>
      
      {/* Action with micro-interaction */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onLike}
          className="flex items-center gap-2 text-sm transition-colors"
        >
          <Heart 
            size={20} 
            weight={isLiked ? 'fill' : 'regular'}
            className={isLiked ? 'text-red-500' : 'text-gray-400'}
          />
          <span className="text-gray-600 dark:text-gray-400">
            {isLiked ? 'Liked' : 'Like'}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
```

This component demonstrates:
- Low saturation colors with dark mode support
- Proper border radius stacking (16px outer, 12px inner with 4px padding)
- 4px-based spacing (p-4, gap-2, space-y-2)
- Consistent icon weights with fill for active state
- Shadow alternatives in dark mode (border instead)
- Smooth animations with proper easings
- Micro-interactions on hover and tap
- WCAG AAA contrast for text
