import { NextResponse } from 'next/server';
import { db } from '../../../../server/src/db/index';

export async function GET() {
    try {
        // Get all projects with their classes and curricula
        const allProjects = await db.query.projects.findMany({
            with: {
                classes: {
                    with: {
                        curricula: true,
                    },
                },
            },
        });

        // Format the data for display
        const formattedData = allProjects.map(project => ({
            id: project.id,
            name: project.name,
            description: project.description,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            classes: project.classes?.map(classItem => ({
                id: classItem.id,
                classCode: classItem.classCode,
                programCode: classItem.programCode,
                programName: classItem.programName,
                orientationCode: classItem.orientationCode,
                orientationName: classItem.orientationName,
                startYear: classItem.startYear,
                graduationYear: classItem.graduationYear,
                curricula: classItem.curricula?.map(curriculum => ({
                    id: curriculum.id,
                    totalPoints: curriculum.totalPoints,
                    isValid: curriculum.isValid,
                    courses: curriculum.courses,
                    createdAt: curriculum.createdAt,
                    updatedAt: curriculum.updatedAt,
                })) || [],
            })) || [],
        }));

        return NextResponse.json({
            success: true,
            data: formattedData,
            totalProjects: allProjects.length,
        });
    } catch (error) {
        console.error('Database view error:', error);
        return NextResponse.json(
            { success: false, error: 'Kunde inte ladda databasdata' },
            { status: 500 }
        );
    }
}


