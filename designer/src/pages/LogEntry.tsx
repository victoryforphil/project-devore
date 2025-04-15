import React, { useState } from 'react';
import { 
  Container, 
  Card, 
  Text, 
  Button, 
  Group, 
  Stack, 
  Loader, 
  Center, 
  Title, 
  TextInput,
  ActionIcon,
  Table,
  ScrollArea
} from '@mantine/core';
import { IconPlus, IconNote, IconTrash, IconRefresh } from '@tabler/icons-react';
import { useLogEntries, useCreateLogEntry, useDeleteLogEntry, type LogEntry as LogEntryType } from '../api/hooks';
import { notifications } from '@mantine/notifications';

export function LogEntry() {
  const [message, setMessage] = useState('');
  // Use a fixed limit for now
  const limit = 100;
  
  const { 
    data: logEntries = [], 
    isLoading, 
    error,
    refetch 
  } = useLogEntries(limit);

  const createLogEntry = useCreateLogEntry();
  const deleteLogEntry = useDeleteLogEntry();

  const handleCreateLogEntry = async () => {
    if (!message.trim()) {
      notifications.show({
        title: 'Error',
        message: 'Please enter a message',
        color: 'red',
      });
      return;
    }

    try {
      await createLogEntry.mutateAsync(message);
      setMessage('');
      notifications.show({
        title: 'Success',
        message: 'Log entry created successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create log entry',
        color: 'red',
      });
    }
  };

  const handleDeleteLogEntry = async (id: string) => {
    try {
      await deleteLogEntry.mutateAsync(id);
      notifications.show({
        title: 'Success',
        message: 'Log entry deleted successfully',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete log entry',
        color: 'red',
      });
    }
  };

  if (isLoading) {
    return (
      <Center h="100%">
        <Loader size="xl" />
      </Center>
    );
  }

  if (error) {
    return (
      <Container size="lg" py="xl">
        <Card withBorder p="xl">
          <Stack align="center" gap="md">
            <IconNote size={48} opacity={0.5} color="red" />
            <Text ta="center" size="lg" fw={500} c="red">Error Loading Log Entries</Text>
            <Text ta="center" c="dimmed">{error instanceof Error ? error.message : 'Failed to load log entries'}</Text>
            <Button
              variant="light"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <Stack gap={0}>
            <Title order={2}>Log Entries</Title>
            <Text c="dimmed">Create and manage system log entries</Text>
          </Stack>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </Group>

        <Card withBorder p="md">
          <Stack gap="md">
            <Group align="flex-end">
              <TextInput
                label="New Log Message"
                placeholder="Enter log message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={handleCreateLogEntry}
                loading={createLogEntry.isPending}
              >
                Add Entry
              </Button>
            </Group>
          </Stack>
        </Card>

        {logEntries.length === 0 ? (
          <Card withBorder p="xl">
            <Stack align="center" gap="md">
              <IconNote size={48} opacity={0.5} />
              <Text ta="center" size="lg" fw={500}>No Log Entries Yet</Text>
              <Text ta="center" c="dimmed">
                Create your first log entry to get started
              </Text>
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={() => setMessage('Initial log entry')}
              >
                Create Log Entry
              </Button>
            </Stack>
          </Card>
        ) : (
          <Card withBorder>
            <ScrollArea h={400}>
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Created At</Table.Th>
                    <Table.Th>Message</Table.Th>
                    <Table.Th style={{ width: 80 }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {logEntries.map((entry: LogEntryType) => (
                    <Table.Tr key={entry.id}>
                      <Table.Td>
                        <Stack gap={0}>
                          <Text size="sm">{new Date(entry.createdAt).toLocaleDateString()}</Text>
                          <Text size="xs" c="dimmed">{new Date(entry.createdAt).toLocaleTimeString()}</Text>
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Text>{entry.message}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => handleDeleteLogEntry(entry.id)}
                            loading={deleteLogEntry.isPending}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        )}
      </Stack>
    </Container>
  );
} 