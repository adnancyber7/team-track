export function applyFilters(rows, filters) {
  if (!rows || rows.length === 0) return [];

  let filtered = [...rows];

  if (filters.dateFrom || filters.dateTo) {
    filtered = filtered.filter((row) => {
      const timeCol = row[2];
      if (!timeCol) return true;

      const rowDate = extractDateFromTimeString(timeCol);
      if (!rowDate) return true;

      if (filters.dateFrom && rowDate < filters.dateFrom) return false;
      if (filters.dateTo && rowDate > filters.dateTo) return false;
      return true;
    });
  }

  if (filters.statuses) {
    const { pending, done, rejected } = filters.statuses;
    const hasStatusFilter = pending || done || rejected;

    if (hasStatusFilter) {
      filtered = filtered.filter((row) => {
        const status = String(row[0] || '').toUpperCase();

        if (pending && (status === 'PENDING' || status === '')) return true;
        if (done && status === 'DONE') return true;
        if (rejected && status === 'REJECTED') return true;

        return false;
      });
    }
  }

  if (filters.searchText && filters.searchText.trim()) {
    const searchLower = filters.searchText.toLowerCase().trim();
    filtered = filtered.filter((row) => {
      return row.some((cell) =>
        String(cell || '').toLowerCase().includes(searchLower)
      );
    });
  }

  if (filters.awbSearch && filters.awbSearch.trim()) {
    const awbLower = filters.awbSearch.toLowerCase().trim();
    filtered = filtered.filter((row) => {
      const awbColumn = String(row[6] || '');
      return awbColumn.toLowerCase().includes(awbLower);
    });
  }

  if (filters.selectedAgent && filters.selectedAgent !== 'all') {
    filtered = filtered.filter((row) => {
      const agentColumn = String(row[5] || '');
      return agentColumn.toLowerCase().includes(filters.selectedAgent.toLowerCase());
    });
  }

  if (filters.selectedRegion && filters.selectedRegion !== 'all') {
    filtered = filtered.filter((row) => {
      const regionColumn = String(row[8] || '');
      return regionColumn.toLowerCase() === filters.selectedRegion.toLowerCase();
    });
  }

  if (filters.sortColumns && filters.sortColumns.length > 0) {
    filtered = applySorting(filtered, filters.sortColumns);
  }

  return filtered;
}

function extractDateFromTimeString(timeStr) {
  const str = String(timeStr || '').trim();
  if (!str) return null;

  const dateMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    return dateMatch[0];
  }

  const dateMatch2 = str.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dateMatch2) {
    return `${dateMatch2[3]}-${dateMatch2[2]}-${dateMatch2[1]}`;
  }

  return null;
}

function applySorting(rows, sortColumns) {
  if (!sortColumns || sortColumns.length === 0) return rows;

  const columnMap = {
    'STATUS': 0,
    'LINE': 1,
    'TIME': 2,
    'LOT': 3,
    'REMARKS': 4,
    'AGENTS': 5,
    "AWB'S": 6,
    'REASON': 7,
    'REGION': 8,
    'CONFIRMATION': 9,
    'AGENT2': 10,
    '2ND REJECTION': 11,
    '2ND CONFIRMATION': 12,
    '3RD REJECTION': 13,
    '3RD CONFIRMATION': 14,
    '4TH REJECTION': 15,
    '4TH CONFIRMATION': 16,
    '5TH REJECTION': 17,
    '5TH CONFIRMATION': 18,
    '6th CONFIRMATION': 19,
    'PRIORITY': 20
  };

  return rows.sort((a, b) => {
    for (const sort of sortColumns) {
      const colIndex = columnMap[sort.column];
      if (colIndex === undefined) continue;

      const aVal = String(a[colIndex] || '');
      const bVal = String(b[colIndex] || '');

      const isNumeric = !isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal));

      let comparison = 0;
      if (isNumeric) {
        comparison = parseFloat(aVal) - parseFloat(bVal);
      } else {
        comparison = aVal.localeCompare(bVal, undefined, { numeric: true });
      }

      if (comparison !== 0) {
        return sort.direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
}

export function getUniqueAgents(rows) {
  const agents = new Set();
  rows.forEach((row) => {
    const agent = String(row[5] || '').trim();
    if (agent) {
      agents.add(agent);
    }
  });
  return Array.from(agents).sort();
}

export function getUniqueRegions(rows) {
  const regions = new Set();
  rows.forEach((row) => {
    const region = String(row[8] || '').trim();
    if (region) {
      regions.add(region);
    }
  });
  return Array.from(regions).sort();
}

export function getFilterStats(rows, filters) {
  const filtered = applyFilters(rows, filters);

  const stats = {
    total: rows.length,
    filtered: filtered.length,
    pending: 0,
    done: 0,
    rejected: 0,
    agents: new Set(),
    regions: new Set()
  };

  filtered.forEach((row) => {
    const status = String(row[0] || '').toUpperCase();
    if (status === 'PENDING' || status === '') stats.pending++;
    else if (status === 'DONE') stats.done++;
    else if (status === 'REJECTED') stats.rejected++;

    const agent = String(row[5] || '').trim();
    if (agent) stats.agents.add(agent);

    const region = String(row[8] || '').trim();
    if (region) stats.regions.add(region);
  });

  stats.agentCount = stats.agents.size;
  stats.regionCount = stats.regions.size;

  return stats;
}

export function createQuickFilter(type, currentDate = null) {
  const today = currentDate || new Date().toISOString().split('T')[0];

  const quickFilters = {
    'all': {
      dateFrom: '',
      dateTo: '',
      statuses: { pending: true, done: true, rejected: true },
      searchText: '',
      selectedAgent: '',
      selectedRegion: '',
      awbSearch: '',
      sortColumns: []
    },
    'today': {
      dateFrom: today,
      dateTo: today,
      statuses: { pending: true, done: true, rejected: true },
      searchText: '',
      selectedAgent: '',
      selectedRegion: '',
      awbSearch: '',
      sortColumns: [{ column: 'TIME', direction: 'desc' }]
    },
    'pending-only': {
      dateFrom: '',
      dateTo: '',
      statuses: { pending: true, done: false, rejected: false },
      searchText: '',
      selectedAgent: '',
      selectedRegion: '',
      awbSearch: '',
      sortColumns: [{ column: 'TIME', direction: 'desc' }]
    },
    'done-only': {
      dateFrom: '',
      dateTo: '',
      statuses: { pending: false, done: true, rejected: false },
      searchText: '',
      selectedAgent: '',
      selectedRegion: '',
      awbSearch: '',
      sortColumns: [{ column: 'TIME', direction: 'desc' }]
    },
    'rejected-only': {
      dateFrom: '',
      dateTo: '',
      statuses: { pending: false, done: false, rejected: true },
      searchText: '',
      selectedAgent: '',
      selectedRegion: '',
      awbSearch: '',
      sortColumns: [{ column: 'TIME', direction: 'desc' }]
    }
  };

  return quickFilters[type] || quickFilters['all'];
}
