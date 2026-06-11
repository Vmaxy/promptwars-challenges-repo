/* ============================================================
   EcoStep - Carbon Footprint Awareness Platform
   Application Logic (app.js)
   ============================================================

   Architecture:
   1. EcoMath    — Pure-function utility for all CO2 calculations.
                   Isolated for independent unit testing.
   2. EcoUI     — DOM manipulation & rendering functions.
   3. EcoApp    — Application state management & event wiring.
   ============================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   1. EcoMath — Pure Calculation Utility
   ──────────────────────────────────────────────────────────────
   Every function is side-effect-free. Coefficients are
   documented with their real-world source.
   ────────────────────────────────────────────────────────────── */

const EcoMath = (() => {

  /* ---------- Carbon Emission Coefficients ----------
     All values in metric tons CO2 per year unless noted.
     Sources: EPA, IPCC AR6, IEA, Our World in Data         */

  const carbonBaselines = {
    globalAveragePerCapita: 4.7,       // metric tons CO2/year (World Bank 2023)
    usAveragePerCapita:     16.0,      // metric tons CO2/year (EPA)
    euAveragePerCapita:     6.8,       // metric tons CO2/year (EU EEA)
    targetSustainable:      2.0,       // Paris-aligned target
  };

  /* Transport coefficients — kg CO2 per km */
  const transportCoefficients = {
    gasCar:        0.21,   // Average gasoline sedan (EPA 2023)
    diesel:        0.27,   // Diesel vehicle
    hybrid:        0.12,   // Hybrid vehicle
    electric:      0.05,   // BEV accounting for grid mix
    publicTransit: 0.04,   // Bus/rail per passenger-km
    bicycle:       0.00,   // Zero direct emissions
    walking:       0.00,   // Zero direct emissions
  };

  /* Energy coefficients — kg CO2 per kWh */
  const energyCoefficients = {
    electricityGrid: 0.42,   // Global avg grid intensity (IEA 2023)
    naturalGas:      0.18,   // Per kWh thermal
    solarRenewable:  0.04,   // Lifecycle emissions
  };

  /* Diet coefficients — metric tons CO2 per year */
  const dietCoefficients = {
    heavyMeat:   3.3,    // Red meat-heavy diet
    averageMeat: 2.5,    // Average omnivore
    lightMeat:   1.7,    // Poultry/fish-focused
    vegetarian:  1.0,    // No meat, dairy allowed
    vegan:       0.7,    // Fully plant-based
  };

  /* Action impact reductions — metric tons CO2 saved per year */
  const actionImpacts = {
    switchToPublicTransit:   { savings: 2.4,  label: 'Switch to public transit',          description: 'Replace daily car commute with bus or rail transit.' },
    carpoolDaily:            { savings: 1.2,  label: 'Carpool to work',                   description: 'Share rides with 2+ people for your daily commute.' },
    bikeOrWalk:              { savings: 2.6,  label: 'Bike or walk for short trips',      description: 'Use active transport for trips under 5 km.' },
    switchToEV:              { savings: 1.8,  label: 'Switch to electric vehicle',        description: 'Replace gas car with a battery-electric vehicle.' },
    reduceMeatIntake:        { savings: 1.5,  label: 'Reduce meat consumption',           description: 'Shift from heavy meat to a flexitarian or vegetarian diet.' },
    goVegan:                 { savings: 2.1,  label: 'Adopt a plant-based diet',          description: 'Switch to a fully vegan diet for maximum dietary impact.' },
    renewableEnergy:         { savings: 1.6,  label: 'Switch to renewable energy',        description: 'Use solar, wind, or other renewable electricity sources.' },
    energyEfficientHome:     { savings: 0.9,  label: 'Improve home energy efficiency',    description: 'Insulate your home, use LED lighting, upgrade appliances.' },
    reduceThermostat:        { savings: 0.5,  label: 'Adjust thermostat by 2°C',          description: 'Lower heating in winter, raise cooling in summer by 2°C.' },
    lineHangDry:             { savings: 0.3,  label: 'Air-dry laundry',                   description: 'Skip the dryer and hang clothes to dry naturally.' },
    reduceFoodWaste:         { savings: 0.4,  label: 'Reduce food waste',                 description: 'Plan meals, compost scraps, and use leftovers wisely.' },
    buyLocalProduce:         { savings: 0.3,  label: 'Buy local & seasonal produce',      description: 'Choose locally-sourced food to cut transport emissions.' },
    eliminateStandbyPower:   { savings: 0.2,  label: 'Eliminate standby power draw',      description: 'Unplug electronics or use smart power strips.' },
    shorterShowers:          { savings: 0.35, label: 'Take shorter showers',              description: 'Limit showers to 5 minutes to save water heating energy.' },
  };

  /* ---- WORKING DAYS PER YEAR ---- */
  const WORKING_DAYS_PER_YEAR = 260;

  /* ---------- Pure Calculation Functions ---------- */

  /**
   * Sanitize a numeric input: parse, default to 0, clamp to non-negative.
   * @param {*} value — Raw input (string, number, or undefined)
   * @returns {number} — Sanitized non-negative number
   */
  function sanitizeNumber(value) {
    const parsed = parseFloat(value);
    return Math.max(0, Number.isFinite(parsed) ? parsed : 0);
  }

  /**
   * Calculate annual transport emissions.
   * Formula: dailyKm × 2 (round trip) × workingDays × coefficient / 1000
   * @param {number} dailyDistanceKm — One-way commute in km
   * @param {string} vehicleType    — Key from transportCoefficients
   * @returns {number} — Metric tons CO2/year
   */
  function calculateTransportationImpact(dailyDistanceKm, vehicleType) {
    const distance    = sanitizeNumber(dailyDistanceKm);
    const coefficient = transportCoefficients[vehicleType] || transportCoefficients.gasCar;
    // Round trip × working days → annual kg → metric tons
    return (distance * 2 * WORKING_DAYS_PER_YEAR * coefficient) / 1000;
  }

  /**
   * Calculate annual energy emissions from household electricity.
   * Formula: monthlyKwh × 12 × gridCoefficient / 1000
   * @param {number} monthlyKwh   — Monthly electricity usage in kWh
   * @param {string} energySource — Key from energyCoefficients
   * @returns {number} — Metric tons CO2/year
   */
  function calculateEnergyImpact(monthlyKwh, energySource) {
    const kwh         = sanitizeNumber(monthlyKwh);
    const coefficient = energyCoefficients[energySource] || energyCoefficients.electricityGrid;
    return (kwh * 12 * coefficient) / 1000;
  }

  /**
   * Retrieve the annual diet impact.
   * @param {string} dietType — Key from dietCoefficients
   * @returns {number} — Metric tons CO2/year
   */
  function calculateDietImpact(dietType) {
    return dietCoefficients[dietType] || dietCoefficients.averageMeat;
  }

  /**
   * Calculate the total annual carbon footprint.
   * @param {Object} inputs — { dailyDistanceKm, vehicleType, monthlyKwh, energySource, dietType }
   * @returns {Object}      — { total, transport, energy, diet } all in metric tons/year
   */
  function calculateTotalFootprint(inputs) {
    const transport = calculateTransportationImpact(inputs.dailyDistanceKm, inputs.vehicleType);
    const energy    = calculateEnergyImpact(inputs.monthlyKwh, inputs.energySource);
    const diet      = calculateDietImpact(inputs.dietType);
    const total     = transport + energy + diet;
    return { total, transport, energy, diet };
  }

  /**
   * Determine which category contributes most.
   * @param {Object} breakdown — { transport, energy, diet }
   * @returns {string} — 'transport' | 'energy' | 'diet'
   */
  function identifyHighestCategory(breakdown) {
    const categories = [
      { key: 'transport', value: breakdown.transport },
      { key: 'energy',    value: breakdown.energy },
      { key: 'diet',      value: breakdown.diet },
    ];
    categories.sort((a, b) => b.value - a.value);
    return categories[0].key;
  }

  /**
   * Generate the top N personalized action suggestions based on
   * the user's highest emission category and current inputs.
   * @param {Object} breakdown    — { transport, energy, diet }
   * @param {Object} currentInputs — { vehicleType, energySource, dietType }
   * @param {number} topN         — How many suggestions to return
   * @returns {Array<Object>}     — Array of { key, label, savings, description }
   */
  function generateSmartSuggestions(breakdown, currentInputs, topN = 3) {
    const highestCategory = identifyHighestCategory(breakdown);
    const suggestions = [];

    /* Build a prioritized list based on the worst category */
    const categoryActions = {
      transport: ['switchToPublicTransit', 'bikeOrWalk', 'carpoolDaily', 'switchToEV'],
      energy:    ['renewableEnergy', 'energyEfficientHome', 'reduceThermostat', 'eliminateStandbyPower'],
      diet:      ['reduceMeatIntake', 'goVegan', 'reduceFoodWaste', 'buyLocalProduce'],
    };

    /* Filter out actions that don't apply to the user's context */
    const relevantActions = categoryActions[highestCategory].filter(key => {
      const action = actionImpacts[key];
      if (!action) return false;

      // Don't suggest switching to public transit if already using it
      if (key === 'switchToPublicTransit' && currentInputs.vehicleType === 'publicTransit') return false;
      // Don't suggest EV if already driving electric
      if (key === 'switchToEV' && currentInputs.vehicleType === 'electric') return false;
      // Don't suggest biking if already biking/walking
      if (key === 'bikeOrWalk' && (currentInputs.vehicleType === 'bicycle' || currentInputs.vehicleType === 'walking')) return false;
      // Don't suggest going vegan if already vegan
      if (key === 'goVegan' && currentInputs.dietType === 'vegan') return false;
      // Don't suggest reducing meat if already vegetarian or vegan
      if (key === 'reduceMeatIntake' && (currentInputs.dietType === 'vegetarian' || currentInputs.dietType === 'vegan')) return false;
      // Don't suggest renewables if already using solar
      if (key === 'renewableEnergy' && currentInputs.energySource === 'solarRenewable') return false;

      // Don't suggest actions that save 0 CO2 under current inputs
      if (getActionSavings(key, currentInputs) <= 0) return false;

      return true;
    });

    for (const key of relevantActions) {
      if (suggestions.length >= topN) break;
      const action = actionImpacts[key];
      suggestions.push({
        key,
        label:       action.label,
        savings:     getActionSavings(key, currentInputs),
        description: action.description,
      });
    }

    /* If we still need more suggestions, pull from other categories */
    if (suggestions.length < topN) {
      const otherKeys = Object.keys(categoryActions).filter(k => k !== highestCategory);
      for (const catKey of otherKeys) {
        for (const key of categoryActions[catKey]) {
          if (suggestions.length >= topN) break;
          if (suggestions.find(s => s.key === key)) continue;
          const action = actionImpacts[key];
          if (!action) continue;

          const dynamicSavings = getActionSavings(key, currentInputs);
          if (dynamicSavings <= 0) continue; // Skip zero-savings suggestions

          suggestions.push({
            key,
            label:       action.label,
            savings:     dynamicSavings,
            description: action.description,
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Generate a personalized action checklist from all actions,
   * sorted by the user's category contribution.
   * @param {Object} breakdown — { transport, energy, diet }
   * @returns {Array<Object>}  — Sorted array of checkable actions
   */
  /**
   * Calculate the dynamic carbon savings for a specific action based on the user's current inputs.
   * @param {string} actionKey - Key of the action
   * @param {Object} inputs - Current user inputs { dailyDistanceKm, vehicleType, monthlyKwh, energySource, dietType }
   * @returns {number} - Metric tons CO2 saved per year
   */
  function getActionSavings(actionKey, inputs) {
    const transportEmissions = calculateTransportationImpact(inputs.dailyDistanceKm, inputs.vehicleType);
    const energyEmissions = calculateEnergyImpact(inputs.monthlyKwh, inputs.energySource);
    const dietEmissions = calculateDietImpact(inputs.dietType);

    switch (actionKey) {
      // --- Transport Actions ---
      case 'switchToPublicTransit':
        if (inputs.vehicleType === 'publicTransit' || inputs.vehicleType === 'bicycle' || inputs.vehicleType === 'walking') {
          return 0;
        }
        return Math.max(0, transportEmissions - calculateTransportationImpact(inputs.dailyDistanceKm, 'publicTransit'));

      case 'carpoolDaily':
        if (inputs.vehicleType === 'publicTransit' || inputs.vehicleType === 'bicycle' || inputs.vehicleType === 'walking') {
          return 0;
        }
        return Math.max(0, transportEmissions * 0.5);

      case 'bikeOrWalk':
        if (inputs.vehicleType === 'bicycle' || inputs.vehicleType === 'walking') {
          return 0;
        }
        return Math.max(0, transportEmissions);

      case 'switchToEV':
        if (inputs.vehicleType === 'electric' || inputs.vehicleType === 'bicycle' || inputs.vehicleType === 'walking') {
          return 0;
        }
        return Math.max(0, transportEmissions - calculateTransportationImpact(inputs.dailyDistanceKm, 'electric'));

      // --- Energy Actions ---
      case 'renewableEnergy':
        if (inputs.energySource === 'solarRenewable') {
          return 0;
        }
        return Math.max(0, energyEmissions - calculateEnergyImpact(inputs.monthlyKwh, 'solarRenewable'));

      case 'energyEfficientHome':
        return Math.max(0, energyEmissions * 0.25);

      case 'reduceThermostat':
        return Math.max(0, energyEmissions * 0.10);

      case 'lineHangDry':
        return Math.min(energyEmissions, 0.3);

      case 'eliminateStandbyPower':
        return Math.max(0, energyEmissions * 0.05);

      case 'shorterShowers':
        return Math.max(0, energyEmissions * 0.10);

      // --- Diet Actions ---
      case 'reduceMeatIntake':
        if (inputs.dietType === 'vegetarian' || inputs.dietType === 'vegan') {
          return 0;
        }
        return Math.max(0, dietEmissions - calculateDietImpact('vegetarian'));

      case 'goVegan':
        if (inputs.dietType === 'vegan') {
          return 0;
        }
        return Math.max(0, dietEmissions - calculateDietImpact('vegan'));

      case 'reduceFoodWaste':
        return Math.max(0, dietEmissions * 0.15);

      case 'buyLocalProduce':
        return Math.max(0, dietEmissions * 0.10);

      default:
        return 0;
    }
  }

  /**
   * Generate a personalized action checklist from all actions,
   * sorted by the user's category contribution.
   * @param {Object} breakdown — { transport, energy, diet }
   * @param {Object} inputs — Current user inputs
   * @returns {Array<Object>}  — Sorted array of checkable actions
   */
  function generateActionChecklist(breakdown, inputs) {
    const highestCategory = identifyHighestCategory(breakdown);

    /* Assign category to each action for sorting */
    const actionCategoryMap = {
      switchToPublicTransit: 'transport',
      carpoolDaily:          'transport',
      bikeOrWalk:            'transport',
      switchToEV:            'transport',
      reduceMeatIntake:      'diet',
      goVegan:               'diet',
      reduceFoodWaste:       'diet',
      buyLocalProduce:       'diet',
      renewableEnergy:       'energy',
      energyEfficientHome:   'energy',
      reduceThermostat:      'energy',
      lineHangDry:           'energy',
      eliminateStandbyPower: 'energy',
      shorterShowers:        'energy',
    };

    const checklist = Object.entries(actionImpacts).map(([key, action]) => ({
      key,
      label:       action.label,
      savings:     getActionSavings(key, inputs),
      description: action.description,
      category:    actionCategoryMap[key] || 'other',
    }));

    /* Sort: highest-category actions first, then by savings descending */
    checklist.sort((a, b) => {
      if (a.category === highestCategory && b.category !== highestCategory) return -1;
      if (b.category === highestCategory && a.category !== highestCategory) return  1;
      return b.savings - a.savings;
    });

    return checklist;
  }

  /**
   * Compare the user's footprint against global benchmarks.
   * @param {number} totalFootprint — Metric tons CO2/year
   * @returns {Object} — { globalComparison, status, percentVsGlobal }
   */
  function compareToBaselines(totalFootprint) {
    const total = sanitizeNumber(totalFootprint);
    const percent = ((total / carbonBaselines.globalAveragePerCapita) * 100).toFixed(0);

    let status;
    if (total <= carbonBaselines.targetSustainable) {
      status = 'excellent';
    } else if (total <= carbonBaselines.globalAveragePerCapita) {
      status = 'below';
    } else if (total <= carbonBaselines.euAveragePerCapita) {
      status = 'average';
    } else {
      status = 'above';
    }

    return {
      globalAverage:   carbonBaselines.globalAveragePerCapita,
      usAverage:       carbonBaselines.usAveragePerCapita,
      euAverage:       carbonBaselines.euAveragePerCapita,
      targetLevel:     carbonBaselines.targetSustainable,
      percentVsGlobal: parseInt(percent, 10),
      status,
    };
  }

  /* ---------- Public API ---------- */
  return Object.freeze({
    carbonBaselines,
    transportCoefficients,
    energyCoefficients,
    dietCoefficients,
    actionImpacts,
    sanitizeNumber,
    calculateTransportationImpact,
    calculateEnergyImpact,
    calculateDietImpact,
    calculateTotalFootprint,
    identifyHighestCategory,
    generateSmartSuggestions,
    generateActionChecklist,
    getActionSavings,
    compareToBaselines,
  });
})();


/* ──────────────────────────────────────────────────────────────
   2. EcoUI — DOM Rendering & Visual Updates
   ──────────────────────────────────────────────────────────────
   All DOM interactions go through this module.
   Uses textContent (never innerHTML for user data) for security.
   ────────────────────────────────────────────────────────────── */

const EcoUI = (() => {

  /* ---------- SVG Progress Ring ---------- */

  /**
   * Update the SVG progress ring to reflect the current footprint.
   * @param {number} totalFootprint — Current metric tons CO2/year
   * @param {number} maxValue       — Maximum scale for the ring (default 20)
   */
  function updateProgressRing(totalFootprint, maxValue = 20) {
    const ring       = document.getElementById('progress-ring-fill');
    const valueEl    = document.getElementById('progress-ring-value');
    const comparison = document.getElementById('comparison-badge');

    if (!ring || !valueEl) return;

    const radius        = parseFloat(ring.getAttribute('r'));
    const circumference = 2 * Math.PI * radius;
    const clamped       = Math.min(Math.max(totalFootprint, 0), maxValue);
    const offset        = circumference - (clamped / maxValue) * circumference;

    ring.style.strokeDasharray  = circumference;
    ring.style.strokeDashoffset = offset;

    /* Color coding based on severity */
    let strokeColor;
    if (totalFootprint <= 2)       strokeColor = '#10b981'; // Excellent
    else if (totalFootprint <= 4.7) strokeColor = '#34d399'; // Below avg
    else if (totalFootprint <= 6.8) strokeColor = '#fbbf24'; // Average
    else if (totalFootprint <= 12)  strokeColor = '#f59e0b'; // Above avg
    else                            strokeColor = '#ef4444'; // High
    ring.style.stroke = strokeColor;

    /* Update the number display securely via textContent */
    valueEl.textContent = totalFootprint.toFixed(1);

    /* Update comparison badge */
    if (comparison) {
      const comparisonData = EcoMath.compareToBaselines(totalFootprint);
      comparison.className = 'comparison-badge ';
      let badgeText = '';

      if (comparisonData.status === 'excellent') {
        comparison.className += 'below';
        badgeText = `✓ ${comparisonData.percentVsGlobal}% of global avg — Excellent!`;
      } else if (comparisonData.status === 'below') {
        comparison.className += 'below';
        badgeText = `✓ ${comparisonData.percentVsGlobal}% of global avg — Below Average`;
      } else if (comparisonData.status === 'average') {
        comparison.className += 'average';
        badgeText = `⚠ ${comparisonData.percentVsGlobal}% of global avg — Near Average`;
      } else {
        comparison.className += 'above';
        badgeText = `▲ ${comparisonData.percentVsGlobal}% of global avg — Above Average`;
      }
      comparison.textContent = badgeText;
    }
  }

  /**
   * Update the category breakdown bar chart.
   * @param {Object} breakdown — { transport, energy, diet }
   */
  function updateCategoryBars(breakdown) {
    const total = breakdown.transport + breakdown.energy + breakdown.diet;
    const categories = [
      { id: 'transport', value: breakdown.transport, color: '#3b82f6', icon: '🚗' },
      { id: 'energy',    value: breakdown.energy,    color: '#f59e0b', icon: '⚡' },
      { id: 'diet',      value: breakdown.diet,      color: '#10b981', icon: '🥗' },
    ];

    categories.forEach(cat => {
      const fillEl  = document.getElementById(`bar-fill-${cat.id}`);
      const valEl   = document.getElementById(`bar-value-${cat.id}`);
      if (!fillEl || !valEl) return;

      const percent = total > 0 ? (cat.value / total) * 100 : 0;
      fillEl.style.width           = `${Math.max(percent, 1)}%`;
      fillEl.style.backgroundColor = cat.color;
      valEl.textContent            = `${cat.value.toFixed(2)} t  (${percent.toFixed(0)}%)`;
    });
  }

  /**
   * Update the stat cards with key metrics.
   * @param {Object} breakdown  — { total, transport, energy, diet }
   * @param {number} savings    — Total savings from checked actions
   */
  function updateStatCards(breakdown, savings) {
    const setStatValue = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setStatValue('stat-total',     breakdown.total.toFixed(1) + ' t');
    setStatValue('stat-transport', breakdown.transport.toFixed(2) + ' t');
    setStatValue('stat-energy',    breakdown.energy.toFixed(2) + ' t');
    setStatValue('stat-diet',      breakdown.diet.toFixed(2) + ' t');
    setStatValue('stat-savings',   '-' + savings.toFixed(2) + ' t');
  }

  /**
   * Render the Smart Assistant panel with context-aware tips.
   * @param {Array}  suggestions  — From EcoMath.generateSmartSuggestions
   * @param {string} highCategory — The user's highest category
   */
  function renderSmartAssistant(suggestions, highCategory) {
    const container = document.getElementById('smart-assistant-tips');
    const contextEl = document.getElementById('assistant-context');
    if (!container) return;

    /* Update context message */
    const categoryLabels = { transport: 'Transportation', energy: 'Energy', diet: 'Diet' };
    if (contextEl) {
      contextEl.textContent = `Your highest impact area is ${categoryLabels[highCategory] || highCategory}. Here are the most effective changes you can make:`;
    }

    /* Clear existing tips and rebuild */
    container.replaceChildren();

    suggestions.forEach((suggestion, index) => {
      const tipCard = document.createElement('div');
      tipCard.className = 'tip-card animate-slide-right';
      tipCard.style.animationDelay = `${index * 100}ms`;

      const tipHeader = document.createElement('div');
      tipHeader.style.cssText = 'display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;';

      const tipNumber = document.createElement('span');
      tipNumber.className = 'tip-number';
      tipNumber.setAttribute('aria-hidden', 'true');
      tipNumber.textContent = String(index + 1);

      const tipTitle = document.createElement('span');
      tipTitle.className = 'tip-title';
      tipTitle.textContent = suggestion.label;

      tipHeader.appendChild(tipNumber);
      tipHeader.appendChild(tipTitle);
      tipCard.appendChild(tipHeader);

      const tipDetail = document.createElement('p');
      tipDetail.className = 'tip-detail';
      tipDetail.textContent = suggestion.description;
      tipCard.appendChild(tipDetail);

      const impactBadge = document.createElement('span');
      impactBadge.className = 'tip-impact-badge';
      impactBadge.style.cssText = 'background:rgba(16,185,129,0.12);color:#34d399;';
      impactBadge.textContent = `↓ ${suggestion.savings.toFixed(1)} t CO₂/year`;
      tipCard.appendChild(impactBadge);

      container.appendChild(tipCard);
    });
  }

  /**
   * Render the action checklist.
   * @param {Array}    checklistItems — From EcoMath.generateActionChecklist
   * @param {Set}      checkedItems   — Set of action keys that are checked
   * @param {Function} onToggle       — Callback(key) when an item is toggled
   */
  function renderChecklist(checklistItems, checkedItems, onToggle) {
    const container = document.getElementById('action-checklist');
    if (!container) return;

    container.replaceChildren();

    checklistItems.forEach((item, index) => {
      const isAlreadyAchieved = (item.savings === 0);
      const isChecked = checkedItems.has(item.key) || isAlreadyAchieved;

      const row = document.createElement('div');
      row.className = `checklist-item${isChecked ? ' checked' : ''}`;
      
      if (isAlreadyAchieved) {
        row.className += ' opacity-75 cursor-default';
        row.setAttribute('role', 'document');
      } else {
        row.setAttribute('role', 'checkbox');
        row.setAttribute('aria-checked', String(isChecked));
        row.setAttribute('tabindex', '0');
      }
      
      row.setAttribute('aria-label', `${item.label}. ${isAlreadyAchieved ? 'Already achieved.' : `Saves ${item.savings.toFixed(1)} metric tons CO2 per year.`} ${item.description}`);
      row.style.animationDelay = `${index * 50}ms`;

      /* Checkbox visual */
      const checkbox = document.createElement('div');
      checkbox.className = 'checklist-checkbox';
      if (isAlreadyAchieved) {
        checkbox.style.backgroundColor = 'var(--eco-600)';
        checkbox.style.borderColor = 'var(--eco-600)';
      }
      checkbox.setAttribute('aria-hidden', 'true');

      const checkIcon = document.createElement('span');
      checkIcon.className = 'checklist-checkbox-icon';
      checkIcon.textContent = '✓';
      if (isAlreadyAchieved) {
        checkIcon.style.opacity = '1';
        checkIcon.style.transform = 'scale(1)';
      }
      checkbox.appendChild(checkIcon);

      /* Content */
      const content = document.createElement('div');
      content.className = 'checklist-content';

      const text = document.createElement('div');
      text.className = 'checklist-text';
      text.textContent = item.label;

      const impact = document.createElement('div');
      impact.className = 'checklist-impact';
      
      if (isAlreadyAchieved) {
        impact.style.color = '#34d399';
        impact.textContent = `✓ Already practicing (reflected in baseline)`;
      } else {
        impact.style.color = isChecked ? '#10b981' : '#f59e0b';
        impact.textContent = isChecked
          ? `✓ Saving ${item.savings.toFixed(1)} t CO₂/year`
          : `↓ Could save ${item.savings.toFixed(1)} t CO₂/year`;
      }

      const desc = document.createElement('div');
      desc.className = 'checklist-description';
      desc.textContent = item.description;

      content.appendChild(text);
      content.appendChild(impact);
      content.appendChild(desc);

      row.appendChild(checkbox);
      row.appendChild(content);

      if (!isAlreadyAchieved) {
        /* Click & keyboard handlers */
        const handleToggle = () => onToggle(item.key);
        row.addEventListener('click', handleToggle);
        row.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            handleToggle();
          }
        });
      }

      container.appendChild(row);
    });
  }

  /**
   * Update the slider value display label.
   * @param {string} sliderId — ID of the range input
   * @param {string} value    — Current value to display
   * @param {string} unit     — Unit suffix (e.g., 'km', 'kWh')
   */
  function updateSliderDisplay(sliderId, value, unit) {
    const display = document.getElementById(`${sliderId}-display`);
    if (display) {
      display.textContent = `${value} ${unit}`;
    }

    /* Update the range track fill */
    const slider = document.getElementById(sliderId);
    if (slider) {
      const min     = parseFloat(slider.min) || 0;
      const max     = parseFloat(slider.max) || 100;
      const current = parseFloat(slider.value) || 0;
      const percent = ((current - min) / (max - min)) * 100;
      const fillEl  = document.getElementById(`${sliderId}-fill`);
      if (fillEl) {
        fillEl.style.width = `${percent}%`;
      }
    }
  }

  /**
   * Update the total savings display shown above the checklist.
   * @param {number} totalSavings — Metric tons CO2 saved
   */
  function updateSavingsDisplay(totalSavings) {
    const el = document.getElementById('total-savings-display');
    if (el) {
      el.textContent = totalSavings.toFixed(1);
    }
  }

  /* ---------- Public API ---------- */
  return Object.freeze({
    updateProgressRing,
    updateCategoryBars,
    updateStatCards,
    renderSmartAssistant,
    renderChecklist,
    updateSliderDisplay,
    updateSavingsDisplay,
  });
})();


/* ──────────────────────────────────────────────────────────────
   3. EcoApp — Application State & Event Orchestration
   ──────────────────────────────────────────────────────────────
   Manages the reactive state: user inputs → recalculate → re-render.
   ────────────────────────────────────────────────────────────── */

const EcoApp = (() => {

  /* ---------- Application State ---------- */
  const state = {
    inputs: {
      dailyDistanceKm: 20,
      vehicleType:     'gasCar',
      monthlyKwh:      300,
      energySource:    'electricityGrid',
      dietType:        'averageMeat',
    },
    checkedActions: new Set(),
    breakdown:      { total: 0, transport: 0, energy: 0, diet: 0 },
  };

  /**
   * Recalculate everything and update all UI components.
   * Called on every input change and action toggle.
   */
  function recalculate() {
    /* 1. Calculate base footprint from inputs */
    state.breakdown = EcoMath.calculateTotalFootprint(state.inputs);

    /* 2. Calculate savings from checked actions */
    let totalSavings = 0;
    state.checkedActions.forEach(key => {
      totalSavings += EcoMath.getActionSavings(key, state.inputs);
    });

    /* 3. Net footprint after deductions (floor at 0) */
    const netTotal = Math.max(0, state.breakdown.total - totalSavings);
    const displayBreakdown = {
      total:     netTotal,
      transport: state.breakdown.transport,
      energy:    state.breakdown.energy,
      diet:      state.breakdown.diet,
    };

    /* 4. Update all visual components */
    EcoUI.updateProgressRing(netTotal);
    EcoUI.updateCategoryBars(state.breakdown);
    EcoUI.updateStatCards(displayBreakdown, totalSavings);
    EcoUI.updateSavingsDisplay(totalSavings);

    /* 5. Update Smart Assistant suggestions */
    const highestCategory = EcoMath.identifyHighestCategory(state.breakdown);
    const suggestions     = EcoMath.generateSmartSuggestions(
      state.breakdown,
      state.inputs,
      3
    );
    EcoUI.renderSmartAssistant(suggestions, highestCategory);

    /* 6. Update Action Checklist */
    const checklist = EcoMath.generateActionChecklist(state.breakdown, state.inputs);
    EcoUI.renderChecklist(checklist, state.checkedActions, toggleAction);
  }

  /**
   * Toggle an action in the checklist and recalculate.
   * @param {string} actionKey — The key of the action to toggle
   */
  function toggleAction(actionKey) {
    if (state.checkedActions.has(actionKey)) {
      state.checkedActions.delete(actionKey);
    } else {
      state.checkedActions.add(actionKey);
    }
    recalculate();
  }

  /**
   * Bind all input event listeners.
   */
  function bindEventListeners() {
    /* ---- Commute Distance Slider ---- */
    const commuteSlider = document.getElementById('commute-distance');
    if (commuteSlider) {
      commuteSlider.addEventListener('input', (e) => {
        const value = EcoMath.sanitizeNumber(e.target.value);
        state.inputs.dailyDistanceKm = value;
        EcoUI.updateSliderDisplay('commute-distance', value, 'km');
        recalculate();
      });
    }

    /* ---- Vehicle Type Select ---- */
    const vehicleSelect = document.getElementById('vehicle-type');
    if (vehicleSelect) {
      vehicleSelect.addEventListener('change', (e) => {
        state.inputs.vehicleType = e.target.value;
        recalculate();
      });
    }

    /* ---- Energy Usage Slider ---- */
    const energySlider = document.getElementById('energy-usage');
    if (energySlider) {
      energySlider.addEventListener('input', (e) => {
        const value = EcoMath.sanitizeNumber(e.target.value);
        state.inputs.monthlyKwh = value;
        EcoUI.updateSliderDisplay('energy-usage', value, 'kWh');
        recalculate();
      });
    }

    /* ---- Energy Source Select ---- */
    const energySourceSelect = document.getElementById('energy-source');
    if (energySourceSelect) {
      energySourceSelect.addEventListener('change', (e) => {
        state.inputs.energySource = e.target.value;
        recalculate();
      });
    }

    /* ---- Diet Type Select ---- */
    const dietSelect = document.getElementById('diet-type');
    if (dietSelect) {
      dietSelect.addEventListener('change', (e) => {
        state.inputs.dietType = e.target.value;
        recalculate();
      });
    }

    /* ---- Smooth-scroll navigation ---- */
    document.querySelectorAll('.eco-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        /* Update active state */
        document.querySelectorAll('.eco-nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });
  }

  /**
   * Initialize the application.
   */
  function init() {
    /* Set initial slider display values */
    EcoUI.updateSliderDisplay('commute-distance', state.inputs.dailyDistanceKm, 'km');
    EcoUI.updateSliderDisplay('energy-usage', state.inputs.monthlyKwh, 'kWh');

    /* Bind events */
    bindEventListeners();

    /* Initial calculation */
    recalculate();
  }

  /* ---------- Public API ---------- */
  return Object.freeze({
    init,
    recalculate,
    getState: () => ({ ...state, checkedActions: new Set(state.checkedActions) }),
  });
})();


/* ──────────────────────────────────────────────────────────────
   4. Bootstrap — DOMContentLoaded
   ────────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  EcoApp.init();
});
