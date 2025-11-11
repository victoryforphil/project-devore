'use client';

import { useEffect, useRef } from 'react';
import {
  DockviewReact,
  DockviewReadyEvent,
  IDockviewPanelProps,
} from 'dockview';
import 'dockview/dist/styles/dockview.css';
import { CreationList } from '@/components/panels/CreationList';
import { GraphView } from '@/components/panels/GraphView';
import { Preview } from '@/components/panels/Preview';
import { Inspector } from '@/components/panels/Inspector';
import { useDarkMode } from '@/hooks/useDarkMode';

const components = {
  creationList: (props: IDockviewPanelProps) => <CreationList />,
  graphView: (props: IDockviewPanelProps) => <GraphView />,
  preview: (props: IDockviewPanelProps) => <Preview />,
  inspector: (props: IDockviewPanelProps) => <Inspector />,
};

export function DockviewLayout() {
  const dockviewRef = useRef<React.ElementRef<typeof DockviewReact>>(null);
  const { isDark } = useDarkMode();

  const onReady = (event: DockviewReadyEvent) => {
    const api = event.api;

    // Create main vertical split
    const creationPanel = api.addPanel({
      id: 'creation',
      component: 'creationList',
      title: 'Creation List',
    });

    const graphPanel = api.addPanel({
      id: 'graph',
      component: 'graphView',
      title: 'Graph View',
      position: { referencePanel: creationPanel, direction: 'right' },
    });

    const previewPanel = api.addPanel({
      id: 'preview',
      component: 'preview',
      title: 'Preview',
      position: { referencePanel: graphPanel, direction: 'right' },
    });

    const inspectorPanel = api.addPanel({
      id: 'inspector',
      component: 'inspector',
      title: 'Inspector',
      position: { referencePanel: graphPanel, direction: 'below' },
    });
  };

  return (
    <div className={`w-full h-full ${isDark ? 'dark' : ''}`}>
      <DockviewReact
        ref={dockviewRef}
        components={components}
        onReady={onReady}
        className="dockview-theme-dark"
      />
    </div>
  );
}

