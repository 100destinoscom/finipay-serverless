import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { cloudinary } from '../../config/cloudinary';
import { authenticate } from '../../middleware/auth';
import { updateProfileSchema } from '../../schemas';
import { BadRequestError } from '../../utils/errors';

export default async function profileRoutes(fastify: FastifyInstance) {
    // GET /api/v1/profile - Get current user profile
    fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
        const user = await prisma.user.findUnique({
            where: { id: request.user!.userId },
            select: {
                id: true,
                email: true,
                name: true,
                companyName: true,
                profileImageUrl: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return reply.send({
            profile: {
                id: user!.id,
                email: user!.email,
                name: user!.name,
                company_name: user!.companyName,
                profile_image_url: user!.profileImageUrl,
                role: user!.role,
                created_at: user!.createdAt,
                updated_at: user!.updatedAt,
            },
        });
    });

    // PUT /api/v1/profile - Update user profile
    fastify.put('/', { preHandler: authenticate }, async (request, reply) => {
        const validatedData = updateProfileSchema.parse(request.body);

        const updatedUser = await prisma.user.update({
            where: { id: request.user!.userId },
            data: {
                ...(validatedData.name && { name: validatedData.name }),
                ...(validatedData.company_name && { companyName: validatedData.company_name }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                companyName: true,
                profileImageUrl: true,
                role: true,
                updatedAt: true,
            },
        });

        return reply.send({
            message: 'Profile updated successfully',
            profile: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                company_name: updatedUser.companyName,
                profile_image_url: updatedUser.profileImageUrl,
                role: updatedUser.role,
                updated_at: updatedUser.updatedAt,
            },
        });
    });

    // POST /api/v1/profile/upload-image - Upload profile image
    fastify.post('/upload-image', { preHandler: authenticate }, async (request: any, reply) => {
        const data = await request.file();

        if (!data) {
            throw new BadRequestError('Image file is required');
        }

        const buffer = await data.toBuffer();

        // Upload to Cloudinary
        const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
            (resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'finpay/profiles',
                        resource_type: 'image',
                        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
                        transformation: [
                            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                            { quality: 'auto', fetch_format: 'auto' },
                        ],
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else if (result) resolve(result);
                        else reject(new Error('Upload failed'));
                    }
                );
                stream.end(buffer);
            }
        );

        // Update user profile with new image URL
        const updatedUser = await prisma.user.update({
            where: { id: request.user!.userId },
            data: {
                profileImageUrl: uploadResult.secure_url,
            },
            select: {
                id: true,
                email: true,
                name: true,
                companyName: true,
                profileImageUrl: true,
            },
        });

        return reply.send({
            message: 'Profile image uploaded successfully',
            profile_image_url: updatedUser.profileImageUrl,
        });
    });
}
