'use client';

import { useMemo, useState } from 'react';
import { Card, Empty, Pagination, Space, Spin, Table, Typography } from 'antd';
import type { ColumnType, TableProps } from 'antd/es/table';
import { useIsMobile } from '../lib/useIsMobile';

const { Text } = Typography;

export type ResponsiveColumn<T> = ColumnType<T> & {
  hideOnMobile?: boolean;
  mobileLabel?: React.ReactNode;
};

function getFieldValue<T extends object>(
  record: T,
  dataIndex: ColumnType<T>['dataIndex']
): unknown {
  if (!dataIndex) return undefined;
  if (Array.isArray(dataIndex)) {
    return dataIndex.reduce<unknown>(
      (obj, key) => (obj as Record<string, unknown> | undefined)?.[key as string],
      record
    );
  }
  return (record as Record<string, unknown>)[dataIndex as string];
}

function getColumnValue<T extends object>(
  col: ResponsiveColumn<T>,
  record: T,
  index: number
): React.ReactNode {
  const value = getFieldValue(record, col.dataIndex);
  if (col.render) {
    const rendered = col.render(value, record, index);
    if (rendered && typeof rendered === 'object' && 'children' in rendered) {
      return (rendered as { children: React.ReactNode }).children;
    }
    return rendered as React.ReactNode;
  }
  if (value === null || value === undefined || value === '') return '-';
  return value as React.ReactNode;
}

function getColumnTitle<T extends object>(col: ResponsiveColumn<T>): React.ReactNode {
  if (col.mobileLabel) return col.mobileLabel;
  if (typeof col.title === 'string' || typeof col.title === 'number') return col.title;
  if (col.key) return String(col.key);
  if (col.dataIndex) return String(col.dataIndex);
  return '';
}

function getRowKeyValue<T extends object>(
  rowKey: TableProps<T>['rowKey'],
  record: T,
  index: number
): string {
  if (typeof rowKey === 'function') return String(rowKey(record));
  if (rowKey) return String(getFieldValue(record, rowKey as ColumnType<T>['dataIndex']));
  return String(index);
}

interface ResponsiveTableProps<T extends object> extends Omit<TableProps<T>, 'columns'> {
  columns: ResponsiveColumn<T>[];
  /** Column key used as card title on mobile; defaults to first non-action column */
  mobileTitleColumnKey?: string;
}

export function ResponsiveTable<T extends object>({
  columns,
  mobileTitleColumnKey,
  dataSource,
  loading,
  pagination,
  rowKey,
  size,
  scroll,
  ...rest
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  const [mobilePage, setMobilePage] = useState(1);

  const paginationConfig = useMemo(() => {
    if (pagination === false) return false;
    if (typeof pagination === 'object') {
      return { pageSize: 10, ...pagination };
    }
    return { pageSize: 10 };
  }, [pagination]);

  if (!isMobile) {
    return (
      <div className="badminton-table-scroll">
        <Table
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={pagination}
          rowKey={rowKey}
          scroll={scroll ?? { x: 'max-content' }}
          size={size}
          {...rest}
        />
      </div>
    );
  }

  const pageSize =
    paginationConfig === false ? dataSource?.length ?? 0 : paginationConfig.pageSize || 10;
  const allData = dataSource ?? [];
  const total = paginationConfig === false ? allData.length : paginationConfig.total ?? allData.length;
  const current =
    paginationConfig === false ? 1 : paginationConfig.current ?? mobilePage;
  const start = (current - 1) * pageSize;
  const pageData =
    paginationConfig === false ? allData : allData.slice(start, start + pageSize);

  const titleCol =
    columns.find((c) => c.key === mobileTitleColumnKey) ??
    columns.find((c) => c.key !== 'actions' && !c.hideOnMobile);
  const detailCols = columns.filter(
    (c) => c.key !== 'actions' && c !== titleCol && !c.hideOnMobile
  );
  const actionCol = columns.find((c) => c.key === 'actions');

  if (loading && allData.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <Spin />
      </div>
    );
  }

  if (allData.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div className="badminton-mobile-list">
      {loading && (
        <div className="flex justify-center py-2">
          <Spin size="small" />
        </div>
      )}
      {pageData.map((record, index) => {
        const rowIndex = start + index;
        return (
          <Card
            key={getRowKeyValue(rowKey, record, rowIndex)}
            size="small"
            className="badminton-mobile-card"
          >
            {titleCol && (
              <div className="mb-2">
                <Text strong className="text-base">
                  {getColumnValue(titleCol, record, rowIndex)}
                </Text>
              </div>
            )}
            <Space direction="vertical" size={6} className="w-full">
              {detailCols.map((col) => (
                <div
                  key={String(col.key ?? col.dataIndex)}
                  className="flex justify-between items-start gap-3 text-sm"
                >
                  <Text type="secondary" className="shrink-0 max-w-[45%]">
                    {getColumnTitle(col)}
                  </Text>
                  <span className="text-right flex-1 min-w-0 break-words">
                    {getColumnValue(col, record, rowIndex)}
                  </span>
                </div>
              ))}
            </Space>
            {actionCol?.render && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                {(() => {
                  const rendered = actionCol.render(undefined, record, rowIndex);
                  if (rendered && typeof rendered === 'object' && 'children' in rendered) {
                    return (rendered as { children: React.ReactNode }).children;
                  }
                  return rendered as React.ReactNode;
                })()}
              </div>
            )}
          </Card>
        );
      })}
      {paginationConfig !== false && total > pageSize && (
        <Pagination
          size="small"
          current={current}
          pageSize={pageSize}
          total={total}
          onChange={(page) => {
            setMobilePage(page);
            paginationConfig.onChange?.(page, pageSize);
          }}
          showSizeChanger={false}
          className="!text-center"
        />
      )}
    </div>
  );
}
