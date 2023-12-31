// Node.js built-in modules

// Third-party libraries
import { type Mongoose } from 'mongoose'

// Own modules
import logger from '../utils/logger.js'

// Define a variable to hold the type of the database connection
let dbConnectionType: 'replicaSet' | 'production' | undefined

// Define variables for the database connector methods that will be set conditionally
let connect: () => Promise<void>
let disconnect: () => Promise<void>
let mongoose: Mongoose

async function initializeDatabaseConnection (): Promise<void> {
    logger.info('Handling database connection...')
    if (process.env.NODE_ENV !== 'production') {
        logger.info('Connecting to non-production database...')
        const replicaSetDatabaseConnector = await import('./replicaSetDatabaseConnector.js')
        connect = replicaSetDatabaseConnector.connectToDatabase
        disconnect = replicaSetDatabaseConnector.disconnectFromDatabase
        mongoose = replicaSetDatabaseConnector.mongoose
        dbConnectionType = 'replicaSet'
    } else {
        logger.info('Connecting to production database...')
        const productionDatabaseConnector = await import('./productionDatabaseConnector.js')
        connect = productionDatabaseConnector.connectToDatabase
        disconnect = productionDatabaseConnector.disconnectFromDatabase
        mongoose = productionDatabaseConnector.mongoose
        dbConnectionType = 'production'
    }

    await connect()
    logger.info('Database connection initialized')
}

async function closeDatabaseConnection (): Promise<void> {
    await disconnect()
    logger.info('Database connection closed')
}

function isMemoryDatabase (): boolean {
    return dbConnectionType === 'replicaSet'
}

export { initializeDatabaseConnection, closeDatabaseConnection, isMemoryDatabase, mongoose }
