import React from 'react';
import { NavLink } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  IconHome,
  IconTimeline, 
  IconCubeSend,
  IconGridDots,
  IconSettings,
} from '@tabler/icons-react';

// Navigation items for the sidebar
const items = [
  { icon: IconHome, label: 'Home', link: '/' },
  { icon: IconCubeSend, label: '3D Designer', link: '/designer' },
  { icon: IconTimeline, label: 'Timeline', link: '/timeline' },
  { 
    icon: IconGridDots, 
    label: 'Generators', 
    links: [
      { label: 'Grid Generator', link: '/generators/grid' },
      { label: 'SVG Import', link: '/generators/svg' },
      { label: 'OBJ Import', link: '/generators/obj' },
    ] 
  },
  { icon: IconSettings, label: 'Settings', link: '/settings' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if a path is active (including child routes)
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Render navigation links
  const links = items.map((item) => {
    // For items with sub-links
    if (item.links) {
      return (
        <NavLink
          key={item.label}
          label={item.label}
          leftSection={<item.icon size="1rem" stroke={1.5} />}
          childrenOffset={28}
          defaultOpened={item.links.some(link => isActive(link.link))}
        >
          {item.links.map((link) => (
            <NavLink
              key={link.label}
              label={link.label}
              onClick={() => navigate(link.link)}
              active={isActive(link.link)}
            />
          ))}
        </NavLink>
      );
    }

    // For regular links
    return (
      <NavLink
        key={item.label}
        label={item.label}
        leftSection={<item.icon size="1rem" stroke={1.5} />}
        onClick={() => navigate(item.link)}
        active={isActive(item.link)}
      />
    );
  });

  return <>{links}</>;
} 