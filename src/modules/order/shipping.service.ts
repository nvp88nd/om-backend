import { Injectable } from '@nestjs/common';
import { Shop } from '../shop/entities/shop.entity';
import { UserAddress } from '../auth/entities/user_address.entity';

export interface ShippingCalculationParams {
    shop: Shop;
    address: UserAddress;
    itemCount: number;
    subtotal: number;
    shippingMethod?: string;
}

export interface ShippingFeeResult {
    base_fee: number;
    distance_fee: number;
    total_fee: number;
}

@Injectable()
export class ShippingService {
    /**
     * Calculate shipping fee based on:
     * - Shop location vs destination address
     * - Item weight/count
     * - Shipping method (standard, express, etc.)
     * - Promotional free shipping
     */
    calculateShippingFee(params: ShippingCalculationParams): ShippingFeeResult {
        const { shop, address, itemCount, subtotal, shippingMethod = 'standard' } = params;

        // Base fee policy
        const baseFeeByMethod = {
            standard: 20000, // 20k VND
            express: 50000,  // 50k VND
            overnight: 80000 // 80k VND
        };

        const baseFee = baseFeeByMethod[shippingMethod] || baseFeeByMethod.standard;

        // Distance-based fee calculation
        // This can be enhanced with real geolocation data
        let distanceFee = 0;

        // Simple province-based pricing
        const isLocalProvince = this.isLocalProvince(shop, address);
        if (!isLocalProvince) {
            // Different province - add distance fee
            distanceFee = 15000; // 15k VND for different province
        }

        // Volume surcharge for multiple items
        if (itemCount > 5) {
            distanceFee += (itemCount - 5) * 5000; // 5k per extra item beyond 5
        }

        // Free shipping for orders above threshold
        const freeShippingThreshold = 500000; // 500k VND
        if (subtotal >= freeShippingThreshold) {
            return {
                base_fee: baseFee,
                distance_fee: distanceFee,
                total_fee: 0
            };
        }

        const totalFee = baseFee + distanceFee;

        return {
            base_fee: baseFee,
            distance_fee: distanceFee,
            total_fee: totalFee
        };
    }

    /**
     * Check if destination is in the same province as shop
     */
    private isLocalProvince(shop: Shop, address: UserAddress): boolean {
        // This is a simple check - could be enhanced with proper location data
        if (!shop.address || !address.province) {
            return false;
        }

        // Extract province name from address string if needed
        const shopProvince = this.extractProvince(shop.address);
        const addressProvince = address.province;

        return shopProvince === addressProvince;
    }

    /**
     * Extract province from address string
     */
    private extractProvince(address: string): string {
        // This is a simplified extraction
        // Could use a more sophisticated parsing or mapping
        const parts = address.split(',').map(p => p.trim());
        return parts[parts.length - 1] || '';
    }

    /**
     * Calculate shipping fee for multiple shop orders
     * Returns total shipping fee and breakdown by shop
     */
    calculateShippingFeeForOrder(
        shopGroups: Array<{ shop: Shop; itemCount: number; subtotal: number }>,
        address: UserAddress,
    ): {
        byShop: Record<string, ShippingFeeResult>;
        totalFee: number;
    } {
        const byShop: Record<string, ShippingFeeResult> = {};
        let totalFee = 0;

        for (const group of shopGroups) {
            const fee = this.calculateShippingFee({
                shop: group.shop,
                address,
                itemCount: group.itemCount,
                subtotal: group.subtotal,
                shippingMethod: 'standard'
            });

            byShop[group.shop.id] = fee;
            totalFee += fee.total_fee;
        }

        return { byShop, totalFee };
    }
}
