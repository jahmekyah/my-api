{\rtf1\ansi\ansicpg1251\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx566\tx1133\tx1700\tx2267\tx2834\tx3401\tx3968\tx4535\tx5102\tx5669\tx6236\tx6803\pardirnatural\partightenfactor0

\f0\fs24 \cf0 // /api/hello.ts\
import type \{ VercelRequest, VercelResponse \} from '@vercel/node';\
\
export default function handler(_req: VercelRequest, res: VercelResponse) \{\
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');\
  res.status(200).send('Hello from Vercel API \uc0\u55357 \u56395 ');\
\}}