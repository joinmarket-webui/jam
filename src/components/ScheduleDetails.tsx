import { Table, Header, HeaderRow, HeaderCell, Body, Row, Cell } from '@table-library/react-table-library/table'
import { useTheme } from '@table-library/react-table-library/theme'
import { Schedule } from '../context/ServiceInfoContext'
import { useSettings } from '../context/SettingsContext'
import Sprite from './Sprite'

import styles from './ScheduleDetails.module.css'

export interface TransformedScheduleEntry {
  id: string
  type: number
  jar: number
}

interface ScheduleDetailsProps {
  schedule: TransformedScheduleEntry[]
}

export default function ScheduleDetails({ schedule }: ScheduleDetailsProps) {
  const settings = useSettings()

  const theme = {
    backgroundColor: settings.theme === 'dark' ? '#333' : '#fff',
    alternateBackgroundColor: settings.theme === 'dark' ? '#444' : '#f5f5f5',
    textColor: settings.theme === 'dark' ? '#fff' : '#000',
  }

  const tableTheme = useTheme({
    Table: `
      --data-table-library_grid-template-columns: repeat(3, 1fr);
    `,
    HeaderRow: `
      background-color: ${theme.backgroundColor};
    `,
    Row: `
      &:nth-of-type(odd) {
        background-color: ${theme.alternateBackgroundColor};
      }
    `,
    Cell: `
      padding: 8px;
      color: ${theme.textColor};
    `,
  })

  const data = {
    nodes: schedule.map((item, index) => ({ id: index, idValue: item.id, type: item.type, jar: item.jar })),
  }

  const getJarLabel = (jarNumber: number) => {
    return String.fromCharCode(65 + jarNumber) // 65 is ASCII for 'A'
  }

  const getStatusIcon = (type: number) => {
    if (type === 2) {
      // Assuming type 2 means completed
      return <Sprite symbol="checkmark" width="16" height="16" className={styles.statusIcon} />
    }
    return null
  }

  if (!schedule || schedule.length === 0) {
    return <div className={styles.scheduleDetails}>No schedule available</div>
  }

  return (
    <div className={styles.scheduleDetails}>
      <h2 className={styles.scheduleDetailsTitle}>Schedule Details</h2>
      <Table data={data} theme={tableTheme}>
        {(tableList: any) => (
          <>
            <Header>
              <HeaderRow>
                <HeaderCell>Id</HeaderCell>
                <HeaderCell>Type</HeaderCell>
                <HeaderCell>Jar</HeaderCell>
                <HeaderCell>Status</HeaderCell>
              </HeaderRow>
            </Header>
            <Body>
              {tableList.map((item: any) => (
                <Row key={item.id} item={item}>
                  <Cell>{item.idValue}</Cell>
                  <Cell>{item.type}</Cell>
                  <Cell>Jar {getJarLabel(item.jar)}</Cell>
                  <Cell>{getStatusIcon(item.type)}</Cell>
                </Row>
              ))}
            </Body>
          </>
        )}
      </Table>
    </div>
  )
}
