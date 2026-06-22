'use client';

import { ConfigProvider } from 'antd';
import idID from 'antd/locale/id_ID';
import './components/badminton.css';

export default function BadmintonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfigProvider
      locale={idID}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
