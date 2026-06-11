# EcoStep - Carbon Footprint Awareness Platform

### 🌍 Chosen Vertical
**[Challenge 3] Carbon Footprint Awareness Platform**
An interactive web application designed to help individuals understand, track, and actively reduce their daily carbon footprint through contextual, dynamic AI-driven insights.

### 🧠 Approach & Logic
- **Contextual Decision Making**: The app evaluates user transit, dietary, and energy habits to generate a dynamic carbon score.
- **Dynamic Action Plan**: Instead of static advice, the system generates 3 targeted, practical daily habits. When completed, they instantly trigger math recalculations to show real-time emission reductions.
- **Evaluation Alignment**: Built ground-up to satisfy strict Code Quality, Security, Resource Efficiency, Testing, and WCAG AA Accessibility guidelines.

### ⚙️ How the Solution Works
1. **Input**: Users input their daily routines using high-contrast, fully keyboard-accessible sliders and fields.
2. **Processing**: Pure math utility functions process the inputs based on standardized environmental impact coefficients.
3. **Output**: Live SVG metrics display the footprint, while an actionable checklist targets the heaviest emission sources.

### 💡 Assumptions Made
- Global average baselines are referenced for standard comparisons.
- Local browser state is trusted for temporary session storage without remote server overhead to ensure high speed and security.
