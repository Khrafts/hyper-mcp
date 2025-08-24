import { ethers } from 'ethers';
import { createComponentLogger } from './logger.js';

const logger = createComponentLogger('CRYPTO_UTILS');

export interface OrderAction {
  type: 'order';
  orders: Array<{
    a: number; // asset id
    b: boolean; // is buy
    p: string; // price
    s: string; // size
    r: boolean; // reduce only
    t: {
      limit?: {
        tif: 'Alo' | 'Ioc' | 'Gtc';
      };
      trigger?: {
        triggerPx: string;
        isMarket: boolean;
        tpsl: 'tp' | 'sl';
      };
    }; // order type
  }>;
  grouping: 'na' | 'normalTpsl' | 'positionTpsl';
}

export interface CancelAction {
  type: 'cancel';
  cancels: Array<{
    a: number; // asset id
    o: number; // order id
  }>;
}

export interface ModifyAction {
  type: 'modify';
  oid: number; // order id
  order: {
    a: number; // asset id
    b: boolean; // is buy
    p: string; // price
    s: string; // size
    r: boolean; // reduce only
    t: {
      limit?: {
        tif: 'Alo' | 'Ioc' | 'Gtc';
      };
      trigger?: {
        triggerPx: string;
        isMarket: boolean;
        tpsl: 'tp' | 'sl';
      };
    }; // order type
  };
}

export type HyperLiquidAction = OrderAction | CancelAction | ModifyAction;

export class HyperLiquidSigner {
  private wallet: ethers.Wallet;

  constructor(privateKey: string) {
    this.wallet = new ethers.Wallet(privateKey);
    logger.info('HyperLiquidSigner initialized', {
      address: this.wallet.address,
    });
  }

  /**
   * Sign a HyperLiquid action using EIP-712 structured data signing
   */
  async signAction(action: HyperLiquidAction, nonce: number): Promise<string> {
    try {
      // Create the structured data for EIP-712 signing
      const domain = {
        name: 'HyperLiquid',
        version: '1',
        chainId: 1337, // HyperLiquid uses 1337
        verifyingContract: '0x0000000000000000000000000000000000000000',
      };

      const types = {
        Agent: [
          { name: 'source', type: 'string' },
          { name: 'connectionId', type: 'bytes32' },
        ],
        HyperLiquidTransaction: [
          { name: 'action', type: 'string' },
          { name: 'nonce', type: 'uint64' },
        ],
      };

      // Convert action to string for signing
      const actionString = JSON.stringify(action);

      const value = {
        action: actionString,
        nonce: nonce,
      };

      logger.debug('Signing HyperLiquid action', {
        action_type: action.type,
        nonce,
        address: this.wallet.address,
      });

      // Sign using EIP-712
      const signature = await this.wallet.signTypedData(domain, types, value);

      logger.debug('Action signed successfully', {
        signature_length: signature.length,
        action_type: action.type,
      });

      return signature;
    } catch (error) {
      logger.error('Failed to sign HyperLiquid action', {
        error: error instanceof Error ? error.message : 'Unknown error',
        action_type: action.type,
        nonce,
      });
      throw error;
    }
  }

  /**
   * Get the wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }

  /**
   * Create a simple market order action
   */
  createMarketOrderAction(
    assetId: number,
    isBuy: boolean,
    size: string,
    reduceOnly: boolean = false
  ): OrderAction {
    return {
      type: 'order',
      orders: [
        {
          a: assetId,
          b: isBuy,
          p: isBuy ? '100000' : '0.001', // Market price approximation
          s: size,
          r: reduceOnly,
          t: {
            limit: {
              tif: 'Ioc', // Immediate or Cancel for market orders
            },
          },
        },
      ],
      grouping: 'na',
    };
  }

  /**
   * Create a limit order action
   */
  createLimitOrderAction(
    assetId: number,
    isBuy: boolean,
    price: string,
    size: string,
    timeInForce: 'Alo' | 'Ioc' | 'Gtc' = 'Gtc',
    reduceOnly: boolean = false
  ): OrderAction {
    return {
      type: 'order',
      orders: [
        {
          a: assetId,
          b: isBuy,
          p: price,
          s: size,
          r: reduceOnly,
          t: {
            limit: {
              tif: timeInForce,
            },
          },
        },
      ],
      grouping: 'na',
    };
  }

  /**
   * Create a cancel order action
   */
  createCancelOrderAction(assetId: number, orderId: number): CancelAction {
    return {
      type: 'cancel',
      cancels: [
        {
          a: assetId,
          o: orderId,
        },
      ],
    };
  }

  /**
   * Create a modify order action
   */
  createModifyOrderAction(
    orderId: number,
    assetId: number,
    isBuy: boolean,
    price: string,
    size: string,
    timeInForce: 'Alo' | 'Ioc' | 'Gtc' = 'Gtc',
    reduceOnly: boolean = false
  ): ModifyAction {
    return {
      type: 'modify',
      oid: orderId,
      order: {
        a: assetId,
        b: isBuy,
        p: price,
        s: size,
        r: reduceOnly,
        t: {
          limit: {
            tif: timeInForce,
          },
        },
      },
    };
  }
}

/**
 * Utility function to create a signer from private key
 */
export function createHyperLiquidSigner(privateKey: string): HyperLiquidSigner {
  return new HyperLiquidSigner(privateKey);
}

/**
 * Validate a HyperLiquid action structure
 */
export function validateAction(action: HyperLiquidAction): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!action.type || !['order', 'cancel', 'modify'].includes(action.type)) {
    errors.push('Invalid action type');
  }

  if (action.type === 'order') {
    const orderAction = action as OrderAction;
    if (!Array.isArray(orderAction.orders) || orderAction.orders.length === 0) {
      errors.push('Order action must have at least one order');
    }

    for (const order of orderAction.orders || []) {
      if (typeof order.a !== 'number') errors.push('Asset ID must be a number');
      if (typeof order.b !== 'boolean') errors.push('Buy flag must be a boolean');
      if (!order.p || isNaN(parseFloat(order.p)))
        errors.push('Price must be a valid number string');
      if (!order.s || isNaN(parseFloat(order.s))) errors.push('Size must be a valid number string');
      if (parseFloat(order.s) <= 0) errors.push('Order size must be positive');
    }
  }

  if (action.type === 'cancel') {
    const cancelAction = action as CancelAction;
    if (!Array.isArray(cancelAction.cancels) || cancelAction.cancels.length === 0) {
      errors.push('Cancel action must have at least one cancel');
    }

    for (const cancel of cancelAction.cancels || []) {
      if (typeof cancel.a !== 'number') errors.push('Asset ID must be a number');
      if (typeof cancel.o !== 'number') errors.push('Order ID must be a number');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
